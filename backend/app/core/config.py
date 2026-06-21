import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent

DATA_DIR = BASE_DIR / "data"
UPLOADS_DIR = DATA_DIR / "uploads"
PREVIEWS_DIR = DATA_DIR / "previews"
OUTPUTS_DIR = DATA_DIR / "outputs"
MODELS_DIR = BASE_DIR / "models"

# Create dirs if they don't exist
for d in [UPLOADS_DIR, PREVIEWS_DIR, OUTPUTS_DIR, MODELS_DIR]:
    d.mkdir(parents=True, exist_ok=True)

# Model config
# Place your RIFE-family checkpoint at: backend/models/rife_checkpoint.pth
# RIFE HD v3.6 model
MODEL_PATH = MODELS_DIR / "rife" / "flownet.pkl"
MODEL_FALLBACK_PATH = MODELS_DIR / "rife" / "flownet.pkl"

APP_VERSION = "1.0.0"
MAX_UPLOAD_BYTES = 500 * 1024 * 1024  # 500 MB
ALLOWED_EXTENSIONS = {".nc", ".netcdf", ".nc4"}
