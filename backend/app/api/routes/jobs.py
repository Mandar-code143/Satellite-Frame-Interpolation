import logging
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException

from backend.app.schemas.job import JobCreated, JobStatus, JobResult, JobInput, ErrorResponse
from backend.app.services import job_manager
from backend.app.core.config import UPLOADS_DIR, OUTPUTS_DIR

router = APIRouter()
logger = logging.getLogger(__name__)


def _run_interpolation_job(job_id: str, file_path_str: str, selected_variable: str,
                            frame_a: int, frame_b: int, demo_mode: bool):
    """Full interpolation pipeline run in a background thread."""
    import xarray as xr
    from pathlib import Path
    from backend.app.services import preprocessing, model_adapter
    from backend.app.services.job_manager import (
        update_job, complete_job, fail_job, build_explanation
    )
    from backend.app.schemas.job import JobStage, ValidationMetrics

    output_dir = OUTPUTS_DIR / job_id
    output_dir.mkdir(parents=True, exist_ok=True)

    try:
        update_job(job_id, JobStage.INSPECTING, 0.1, "Opening NetCDF dataset")

        if demo_mode:
            # Generate synthetic demo frames
            import numpy as np
            from PIL import Image

            update_job(job_id, JobStage.PREPROCESSING, 0.3, "Generating demo synthetic frames")
            x = np.linspace(0, 4 * np.pi, 512)
            y = np.linspace(0, 4 * np.pi, 512)
            xx, yy = np.meshgrid(x, y)
            frame_a_arr = (np.sin(xx) * np.cos(yy) * 127 + 128).astype(np.uint8)
            frame_b_arr = (np.sin(xx + 0.5) * np.cos(yy + 0.5) * 127 + 128).astype(np.uint8)

            path_a = output_dir / "frameA.png"
            path_b = output_dir / "frameB.png"
            Image.fromarray(frame_a_arr, "L").save(str(path_a))
            Image.fromarray(frame_b_arr, "L").save(str(path_b))

            preprocessing_stats = {
                "frameA": {"normalizationMethod": "synthetic", "index": 0, "shape": [512, 512]},
                "frameB": {"normalizationMethod": "synthetic", "index": 1, "shape": [512, 512]},
            }
            detected_dims = ["y", "x"]
            selected_var = "demo_synthetic"
        else:
            file_path = Path(file_path_str)
            if not file_path.exists():
                fail_job(job_id, "Uploaded file not found on server")
                return

            ds = xr.open_dataset(str(file_path), engine="netcdf4", mask_and_scale=False)
            detected_dims = list(ds.dims.keys())
            selected_var = selected_variable

            update_job(job_id, JobStage.PREPROCESSING, 0.3, f"Preprocessing variable '{selected_var}'")
            try:
                path_a, path_b, preprocessing_stats = preprocessing.preprocess_variable(
                    ds, selected_var, output_dir, job_id,
                    frame_a_index=frame_a,
                    frame_b_index=frame_b,
                )
            finally:
                ds.close()

        update_job(job_id, JobStage.LOADING_MODEL, 0.5, "Loading interpolation model adapter")
        model_status = model_adapter.get_model_status()
        mode_label = "DEMO MODE" if model_status["fallbackMode"] else "RIFE inference"

        update_job(job_id, JobStage.RUNNING_INFERENCE, 0.65, f"Running frame interpolation ({mode_label})")
        interpolated_arr, is_fallback, interp_mode = model_adapter.run_interpolation(path_a, path_b)

        # Save interpolated frame
        from PIL import Image
        interp_path = output_dir / "interpolated.png"
        Image.fromarray(interpolated_arr, "L").save(str(interp_path))

        update_job(job_id, JobStage.GENERATING_VALIDATION, 0.85, "Computing validation metrics")
        # No ground truth available in the standard flow
        metrics_data = {"groundTruthAvailable": False}

        # Build result
        base_url = f"http://127.0.0.1:8000/api/outputs/{job_id}"
        explanation = build_explanation(
            selected_variable=selected_var,
            detected_dims=detected_dims,
            norm_method="percentile (2nd–98th percentile)",
            interp_mode=interp_mode,
            is_fallback=is_fallback,
            preprocessing_stats=preprocessing_stats,
            dataset_notes=["Demo synthetic data" if demo_mode else "Real NetCDF data processed"],
        )

        print("ACTIVE JOBS.PY HIT")
        print(base_url)
        result = {
            "jobId": job_id,
            "status": "completed",
            "frameAUrl": f"{base_url}/frameA.png",
            "frameBUrl": f"{base_url}/frameB.png",
            "interpolatedUrl": f"{base_url}/interpolated.png",
            "metrics": metrics_data,
            "explanation": explanation.model_dump(),
            "processingTimeMs": 0,
            "fallbackMode": is_fallback,
        }
        complete_job(job_id, result)

    except Exception as e:
        logger.exception(f"Job {job_id} pipeline error")
        fail_job(job_id, str(e))


@router.post("/jobs/create", response_model=JobCreated)
async def create_job(body: JobInput):
    # Look up the uploaded file
    file_path_str = ""
    if not body.demoMode:
        meta_file = UPLOADS_DIR / f"{body.uploadId}.meta"
        if not meta_file.exists():
            raise HTTPException(status_code=404, detail=f"Upload '{body.uploadId}' not found")
        file_path_str = meta_file.read_text().strip()

    job_id = job_manager.create_job()

    # Run in background thread
    job_manager.run_job_async(
        job_id,
        _run_interpolation_job,
        file_path_str,
        body.selectedVariable,
        body.frameA or 0,
        body.frameB if body.frameB is not None else -1,
        body.demoMode,
    )

    return JobCreated(
        jobId=job_id,
        status="queued",
        createdAt=datetime.now(timezone.utc).isoformat(),
    )


@router.get("/jobs/{job_id}/status", response_model=JobStatus)
async def get_job_status(job_id: str):
    status = job_manager.get_job_status(job_id)
    if not status:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found")
    return status


@router.get("/jobs/{job_id}/result", response_model=JobResult)
async def get_job_result(job_id: str):
    result = job_manager.get_job_result(job_id)
    if not result:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found")
    return result
