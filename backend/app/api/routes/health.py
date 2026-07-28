from fastapi import APIRouter
from datetime import datetime, timezone

from app.schemas.health import HealthStatus, ModelStatus
from app.services.model_adapter import get_model_status
from app.core.config import APP_VERSION

router = APIRouter()


@router.get("/healthz", response_model=HealthStatus)
async def health_check():
    status = get_model_status()
    return HealthStatus(
        status="ok",
        version=APP_VERSION,
        timestamp=datetime.now(timezone.utc).isoformat(),
        modelAvailable=status["modelExists"],
        fallbackMode=status["fallbackMode"],
        backendReady=True,
    )


@router.get("/models/status", response_model=ModelStatus)
async def model_status():
    status = get_model_status()
    return ModelStatus(**status)
