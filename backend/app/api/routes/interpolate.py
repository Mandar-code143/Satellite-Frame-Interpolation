"""
Main orchestration endpoint for frame interpolation.
Accepts multipart form data (file + params), creates a job internally,
runs it synchronously (for small files), and returns the result.
"""
import uuid
import logging
import aiofiles
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional

from backend.app.core.config import UPLOADS_DIR, OUTPUTS_DIR, MAX_UPLOAD_BYTES, ALLOWED_EXTENSIONS
from backend.app.schemas.job import JobResult
from backend.app.services import job_manager, preprocessing, model_adapter
from backend.app.services.job_manager import build_explanation

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/interpolate", response_model=JobResult)
async def interpolate_frames(
    file: Optional[UploadFile] = File(None),
    selectedVariable: Optional[str] = Form(None),
    frameA: Optional[str] = Form("0"),
    frameB: Optional[str] = Form("-1"),
    demoMode: Optional[str] = Form("false"),
):
    import time
    start_time = time.time()
    is_demo = demoMode and demoMode.lower() == "true"

    # Create a job ID for this request
    job_id = str(uuid.uuid4())[:12]
    output_dir = OUTPUTS_DIR / job_id
    output_dir.mkdir(parents=True, exist_ok=True)

    try:
        if is_demo or file is None:
            # Generate synthetic demo data
            import numpy as np
            from PIL import Image

            x = np.linspace(0, 4 * np.pi, 512)
            y = np.linspace(0, 4 * np.pi, 512)
            xx, yy = np.meshgrid(x, y)
            frame_a_arr = (np.sin(xx) * np.cos(yy) * 127 + 128).astype(np.uint8)
            frame_b_arr = (np.sin(xx + 0.5) * np.cos(yy + 0.5) * 127 + 128).astype(np.uint8)

            path_a = output_dir / "frameA.png"
            path_b = output_dir / "frameB.png"
            Image.fromarray(frame_a_arr, "L").save(str(path_a))
            Image.fromarray(frame_b_arr, "L").save(str(path_b))

            detected_dims = ["y", "x"]
            selected_var = "demo_synthetic"
            preprocessing_stats = {}
        else:
            # Save the uploaded file
            suffix = Path(file.filename or "").suffix.lower() or ".nc"
            upload_path = UPLOADS_DIR / f"{job_id}{suffix}"

            async with aiofiles.open(str(upload_path), "wb") as f:
                total = 0
                while chunk := await file.read(1024 * 1024):
                    total += len(chunk)
                    if total > MAX_UPLOAD_BYTES:
                        raise HTTPException(status_code=413, detail="File too large")
                    await f.write(chunk)

            import xarray as xr
            ds = xr.open_dataset(str(upload_path), engine="netcdf4", mask_and_scale=False)
            detected_dims = list(ds.dims.keys())
            selected_var = selectedVariable or list(ds.data_vars.keys())[0]

            try:
                frame_a_idx = int(frameA or 0)
                frame_b_idx = int(frameB or -1)
            except ValueError:
                frame_a_idx = 0
                frame_b_idx = -1

            try:
                path_a, path_b, preprocessing_stats = preprocessing.preprocess_variable(
                    ds, selected_var, output_dir, job_id,
                    frame_a_index=frame_a_idx,
                    frame_b_index=frame_b_idx,
                )
            finally:
                ds.close()

        # Run interpolation
        interpolated_arr, is_fallback, interp_mode = model_adapter.run_interpolation(path_a, path_b)

        from PIL import Image
        interp_path = output_dir / "interpolated.png"
        Image.fromarray(interpolated_arr, "L").save(str(interp_path))

        elapsed_ms = int((time.time() - start_time) * 1000)

        explanation = build_explanation(
            selected_variable=selected_var,
            detected_dims=detected_dims,
            norm_method="percentile (2nd–98th percentile)",
            interp_mode=interp_mode,
            is_fallback=is_fallback,
            preprocessing_stats=preprocessing_stats,
            dataset_notes=["Demo synthetic data" if is_demo else "Real NetCDF data"],
        )

        base_url = f"/api/outputs/{job_id}"
        return JobResult(
            jobId=job_id,
            status="completed",
            frameAUrl=f"{base_url}/frameA.png",
            frameBUrl=f"{base_url}/frameB.png",
            interpolatedUrl=f"{base_url}/interpolated.png",
            metrics=None,
            explanation=explanation,
            processingTimeMs=elapsed_ms,
            fallbackMode=is_fallback,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Interpolation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
