import uuid
import logging
import aiofiles
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException

from backend.app.core.config import UPLOADS_DIR, MAX_UPLOAD_BYTES, ALLOWED_EXTENSIONS
from backend.app.services.netcdf_service import inspect_netcdf
from backend.app.schemas.dataset import DatasetMetadata
from backend.app.schemas.job import ErrorResponse

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/inspect", response_model=DatasetMetadata)
async def inspect_dataset(file: UploadFile = File(...)):
    # Validate extension
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS and suffix != "":
        # Also allow no extension — try to open it anyway
        if suffix and suffix not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type '{suffix}'. Must be a NetCDF file (.nc, .nc4, .netcdf).",
            )

    # Save uploaded file
    upload_id = str(uuid.uuid4())[:8]
    save_path = UPLOADS_DIR / f"{upload_id}{suffix or '.nc'}"

    try:
        async with aiofiles.open(str(save_path), "wb") as f:
            total = 0
            while chunk := await file.read(1024 * 1024):  # 1MB chunks
                total += len(chunk)
                if total > MAX_UPLOAD_BYTES:
                    raise HTTPException(status_code=413, detail="File too large (max 500MB)")
                await f.write(chunk)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"File upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {e}")

    # Inspect the NetCDF
    try:
        metadata = inspect_netcdf(save_path)
        # Store upload_id in a sidecar file for later job creation
        (UPLOADS_DIR / f"{upload_id}.meta").write_text(str(save_path))
        return DatasetMetadata(**metadata)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Inspection failed: {e}")
        raise HTTPException(status_code=500, detail=f"Inspection failed: {e}")
