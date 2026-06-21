"""
ML Model Adapter — RIFE-family frame interpolation.

CHECKPOINT PLACEMENT:
  Place your RIFE-compatible model weights at:
    backend/models/rife_checkpoint.pth
  or
    backend/models/rife_v4.pth

If no checkpoint is found, the adapter falls back to a scientifically
honest blend interpolation that still demonstrates the full pipeline.

The adapter is designed so swapping in a real RIFE model requires
only updating `_load_real_model()` and `_run_real_inference()`.
"""
import numpy as np
from pathlib import Path
from typing import Tuple, Optional
import logging

logger = logging.getLogger(__name__)


def _detect_device() -> str:
    try:
        import torch
        if torch.cuda.is_available():
            return "cuda"
        if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
            return "mps"
        return "cpu"
    except ImportError:
        return "cpu"


def _get_torch_version() -> Optional[str]:
    try:
        import torch
        return torch.__version__
    except ImportError:
        return None


def _model_exists(model_path: Path) -> bool:
    return model_path.exists() and model_path.stat().st_size > 1024


def get_model_status() -> dict:
    from backend.app.core.config import MODEL_PATH, MODEL_FALLBACK_PATH

    device = _detect_device()
    torch_version = _get_torch_version()

    for path in [MODEL_PATH, MODEL_FALLBACK_PATH]:
        if _model_exists(path):
            return {
                "modelExists": True,
                "modelPath": str(path),
                "inferenceReady": True,
                "fallbackMode": False,
                "device": device,
                "torchVersion": torch_version,
            }

    return {
        "modelExists": False,
        "modelPath": str(MODEL_PATH),
        "inferenceReady": True,  # fallback is always ready
        "fallbackMode": True,
        "device": device,
        "torchVersion": torch_version,
    }


def _fallback_interpolate(
    frame_a: np.ndarray,
    frame_b: np.ndarray,
) -> np.ndarray:
    """
    Fallback interpolation: scientifically honest weighted blend with
    a slight Gaussian smoothing to simulate temporal coherence.
    """
    import cv2

    a = frame_a.astype(np.float32)
    b = frame_b.astype(np.float32)

    # Weighted midpoint blend
    mid = 0.5 * a + 0.5 * b

    # Apply gentle smoothing to reduce hard edges at boundaries
    mid_smooth = cv2.GaussianBlur(mid, (3, 3), sigmaX=0.5)

    return np.clip(mid_smooth, 0, 255).astype(np.uint8)


def _load_real_model(model_path: Path, device: str):
    try:
        from backend.models.rife.RIFE_HDv3 import Model

        model = Model()
        model.load_model("backend/models/rife", rank=-1)
        model.eval()

        logger.info("RIFE HD v3 model loaded successfully")

        return model

    except Exception as e:
        logger.error(f"Failed to load RIFE model: {e}")
        return None


def _run_real_inference(
    model,
    frame_a: np.ndarray,
    frame_b: np.ndarray,
    device: str,
) -> np.ndarray:

    import torch
    import cv2

    logger.info("Running REAL RIFE inference")

    # Convert BGR → RGB
    frame_a = cv2.cvtColor(frame_a, cv2.COLOR_BGR2RGB)
    frame_b = cv2.cvtColor(frame_b, cv2.COLOR_BGR2RGB)

    # Convert to tensor
    img0 = (
        torch.from_numpy(frame_a)
        .permute(2, 0, 1)
        .float()
        .unsqueeze(0)
        / 255.0
    )

    img1 = (
        torch.from_numpy(frame_b)
        .permute(2, 0, 1)
        .float()
        .unsqueeze(0)
        / 255.0
    )

    img0 = img0.to(device)
    img1 = img1.to(device)

    with torch.no_grad():
        output = model.inference(img0, img1)

    output = (
        output[0]
        .permute(1, 2, 0)
        .cpu()
        .numpy()
    )

    output = (output * 255.0).clip(0, 255).astype(np.uint8)

    output = cv2.cvtColor(output, cv2.COLOR_RGB2BGR)
    
    print("Input A mean:", frame_a.mean())
    print("Input B mean:", frame_b.mean())
    print("Output mean:", output.mean())

    logger.info("REAL RIFE inference completed")

    return output


def run_interpolation(
    frame_a_path: Path,
    frame_b_path: Path,
) -> Tuple[np.ndarray, bool, str]:
    """
    Main interpolation entry point.

    Returns: (interpolated_frame_uint8, is_fallback, mode_label)
    """
    import cv2
    from backend.app.core.config import MODEL_PATH, MODEL_FALLBACK_PATH

    # Load source frames
    a = cv2.imread(str(frame_a_path), cv2.IMREAD_COLOR)
    b = cv2.imread(str(frame_b_path), cv2.IMREAD_COLOR)

    if a is None or b is None:
        raise ValueError("Could not load source frames for interpolation")

    device = _detect_device()
    status = get_model_status()

    if status["fallbackMode"]:
        logger.info("Running fallback blend interpolation (no model weights found)")
        result = _fallback_interpolate(a, b)
        return result, True, "fallback-blend"

    # Try to load and run real model
    model_path = Path(status["modelPath"])
    model = _load_real_model(model_path, device)

    if model is None:
        logger.warning("Model load failed — falling back to blend")
        result = _fallback_interpolate(a, b)
        return result, True, "fallback-blend"

    try:
        result = _run_real_inference(model, a, b, device)
        return result, False, "rife-inference"
    except Exception as e:
        logger.error(f"Inference error: {e} — falling back")
        result = _fallback_interpolate(a, b)
        return result, True, "fallback-blend"
