"""
ISRO Satellite Frame Interpolation — FastAPI Backend
"""
import logging
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.api.routes import health, inspect, jobs, interpolate, outputs

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="ISRO Satellite Frame Interpolation API",
    version="1.0.0",
    description="Scientific frame interpolation for NetCDF satellite datasets",
)

# CORS — allow all origins for local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers under /api prefix
app.include_router(health.router, prefix="/api", tags=["health"])
app.include_router(inspect.router, prefix="/api", tags=["inspect"])
app.include_router(jobs.router, prefix="/api", tags=["jobs"])
app.include_router(interpolate.router, prefix="/api", tags=["interpolate"])
app.include_router(outputs.router, prefix="/api", tags=["outputs"])


@app.on_event("startup")
async def startup_event():
    from backend.app.core.config import UPLOADS_DIR, PREVIEWS_DIR, OUTPUTS_DIR, MODELS_DIR
    for d in [UPLOADS_DIR, PREVIEWS_DIR, OUTPUTS_DIR, MODELS_DIR]:
        d.mkdir(parents=True, exist_ok=True)
    logger.info("ISRO Satellite Frame Interpolation backend started")
    logger.info(f"Place RIFE checkpoint at: {MODELS_DIR}/rife_checkpoint.pth")
