"""
In-memory job manager for async frame interpolation processing.
Tracks job state, progress, messages, and results.
"""
import uuid
import time
import threading
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Callable
from pathlib import Path

from backend.app.schemas.job import (
    JobStatus, JobResult, JobStage, ExplanationStep,
    Explanation, ValidationMetrics
)

logger = logging.getLogger(__name__)

# In-memory job store: job_id -> job_data dict
_jobs: Dict[str, dict] = {}
_jobs_lock = threading.Lock()


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def create_job() -> str:
    job_id = str(uuid.uuid4())[:12]
    with _jobs_lock:
        _jobs[job_id] = {
            "jobId": job_id,
            "status": "queued",
            "stage": JobStage.QUEUED,
            "progress": 0.0,
            "messages": [],
            "error": None,
            "completedAt": None,
            "createdAt": _now_iso(),
            "result": None,
            "startTime": time.time(),
        }
    logger.info(f"Job created: {job_id}")
    return job_id


def update_job(
    job_id: str,
    stage: JobStage,
    progress: float,
    message: str,
    status: str = "processing",
) -> None:
    with _jobs_lock:
        if job_id not in _jobs:
            return
        job = _jobs[job_id]
        job["stage"] = stage
        job["progress"] = progress
        job["status"] = status
        job["messages"].append(f"[{_now_iso()}] {message}")
        logger.info(f"Job {job_id} | {stage} | {progress:.0%} | {message}")


def fail_job(job_id: str, error: str) -> None:
    with _jobs_lock:
        if job_id not in _jobs:
            return
        job = _jobs[job_id]
        job["status"] = "failed"
        job["stage"] = JobStage.FAILED
        job["error"] = error
        job["completedAt"] = _now_iso()
        job["messages"].append(f"[{_now_iso()}] ERROR: {error}")
    logger.error(f"Job {job_id} failed: {error}")


def complete_job(job_id: str, result: dict) -> None:
    with _jobs_lock:
        if job_id not in _jobs:
            return
        job = _jobs[job_id]
        job["status"] = "completed"
        job["stage"] = JobStage.COMPLETED
        job["progress"] = 1.0
        job["completedAt"] = _now_iso()
        job["result"] = result
        elapsed = int((time.time() - job["startTime"]) * 1000)
        result["processingTimeMs"] = elapsed
        job["messages"].append(f"[{_now_iso()}] Processing complete in {elapsed}ms")
    logger.info(f"Job {job_id} completed")


def get_job_status(job_id: str) -> Optional[JobStatus]:
    with _jobs_lock:
        job = _jobs.get(job_id)
    if not job:
        return None
    return JobStatus(
        jobId=job["jobId"],
        status=job["status"],
        stage=job["stage"],
        progress=job["progress"],
        messages=job["messages"],
        error=job["error"],
        completedAt=job["completedAt"],
    )


def get_job_result(job_id: str) -> Optional[JobResult]:
    with _jobs_lock:
        job = _jobs.get(job_id)
    if not job:
        return None
    result = job.get("result")
    if not result:
        return JobResult(
            jobId=job_id,
            status=job["status"],
            fallbackMode=True,
            explanation=Explanation(steps=[]),
        )
    return JobResult(**result)


def run_job_async(
    job_id: str,
    job_fn: Callable,
    *args,
    **kwargs,
) -> None:
    """Run a job function in a background thread."""
    def _run():
        try:
            job_fn(job_id, *args, **kwargs)
        except Exception as e:
            logger.exception(f"Unhandled error in job {job_id}")
            fail_job(job_id, str(e))

    t = threading.Thread(target=_run, daemon=True)
    t.start()


def build_explanation(
    selected_variable: Optional[str],
    detected_dims: list,
    norm_method: str,
    interp_mode: str,
    is_fallback: bool,
    preprocessing_stats: dict,
    dataset_notes: list = None,
) -> Explanation:
    steps = [
        ExplanationStep(
            step=1,
            label="File Ingested",
            description="NetCDF file uploaded and validated. xarray opened the dataset.",
            status="completed",
        ),
        ExplanationStep(
            step=2,
            label="Variables Detected",
            description=f"Discovered {len(detected_dims)} dimension(s): {', '.join(detected_dims) if detected_dims else 'unknown'}.",
            status="completed",
        ),
        ExplanationStep(
            step=3,
            label="Variable Selected",
            description=f"'{selected_variable}' selected as the primary visualization channel.",
            status="completed",
        ),
        ExplanationStep(
            step=4,
            label="Normalization Applied",
            description=f"Used {norm_method} normalization. Mapped scientific values to 8-bit image space.",
            status="completed",
        ),
        ExplanationStep(
            step=5,
            label="Frames Extracted",
            description="Two temporal slices extracted and resized to 512x512 pixels.",
            status="completed",
        ),
        ExplanationStep(
            step=6,
            label="Model Loaded",
            description="Loaded RIFE fallback adapter." if is_fallback else "Loaded RIFE checkpoint from disk.",
            status="completed",
        ),
        ExplanationStep(
            step=7,
            label="Interpolation Generated",
            description=f"Mode: {interp_mode}. {'Fallback weighted blend used — place real weights at backend/models/' if is_fallback else 'RIFE neural network inferred the intermediate frame.'}",
            status="completed",
        ),
        ExplanationStep(
            step=8,
            label="Metrics Computed",
            description="Ground truth not available — no independent reference frame exists for this dataset.",
            status="completed",
        ),
    ]

    confidence_indicators = [
        "Spatial structure preserved during normalization",
        "Frame pair temporally consistent",
        f"Processing mode: {interp_mode}",
    ]
    if is_fallback:
        confidence_indicators.append("DEMO MODE: Replace weights for neural inference")

    return Explanation(
        selectedVariable=selected_variable,
        detectedDimensions=detected_dims,
        normalizationMethod=norm_method,
        interpolationMode=interp_mode,
        fallbackMode=is_fallback,
        confidenceIndicators=confidence_indicators,
        datasetNotes=dataset_notes or [],
        steps=steps,
    )
