from pathlib import Path
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from backend.app.core.config import OUTPUTS_DIR

router = APIRouter()


@router.get("/outputs/{job_id}/{filename}")
async def get_output_file(job_id: str, filename: str):
    # Security: prevent path traversal
    if ".." in job_id or ".." in filename or "/" in filename:
        raise HTTPException(status_code=400, detail="Invalid path")

    file_path = OUTPUTS_DIR / job_id / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    # Determine media type
    suffix = file_path.suffix.lower()
    media_type_map = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".tif": "image/tiff",
        ".tiff": "image/tiff",
    }
    media_type = media_type_map.get(suffix, "application/octet-stream")

    return FileResponse(str(file_path), media_type=media_type)
