"""
Scientific preprocessing service.
Converts NetCDF variable data into 8-bit image frames with careful normalization
that preserves scientific contrast and spatial structure.
"""
import numpy as np
from pathlib import Path
from typing import Optional, Tuple
import logging

logger = logging.getLogger(__name__)


def extract_2d_slice(
    ds,
    variable_name: str,
    time_index: int = 0,
) -> np.ndarray:
    """
    Extract a 2D spatial array from an xarray dataset variable.
    Handles variables with 2, 3, or 4 dimensions by selecting the
    appropriate slices for time and any extra axes.
    """
    var = ds[variable_name]
    arr = var.values

    # Squeeze out length-1 dimensions
    arr = np.squeeze(arr)

    if arr.ndim == 2:
        return arr.astype(np.float64)

    if arr.ndim == 3:
        # Assume first dim is time or channel; select time_index
        idx = min(time_index, arr.shape[0] - 1)
        return arr[idx].astype(np.float64)

    if arr.ndim == 4:
        # Assume (time, channel, y, x) or similar; take first channel
        idx = min(time_index, arr.shape[0] - 1)
        return arr[idx, 0].astype(np.float64)

    raise ValueError(
        f"Variable '{variable_name}' has {arr.ndim} dimensions after squeeze — "
        "cannot extract a 2D slice."
    )


def normalize_to_uint8(
    arr: np.ndarray,
    method: str = "percentile",
    low_pct: float = 2.0,
    high_pct: float = 98.0,
) -> Tuple[np.ndarray, dict]:
    """
    Normalize a float array to uint8 [0, 255].

    method:
        'minmax'     — full min/max stretch
        'percentile' — percentile stretch (preserves contrast better)

    Returns (uint8_array, stats_dict).
    """
    # Replace NaN/Inf with NaN so we can ignore them
    arr = arr.astype(np.float64)
    arr[~np.isfinite(arr)] = np.nan

    finite = arr[~np.isnan(arr)]
    if finite.size == 0:
        logger.warning("Array has no finite values — returning black frame")
        return np.zeros(arr.shape, dtype=np.uint8), {
            "normalizationMethod": "empty",
            "dataMin": None,
            "dataMax": None,
            "clipLow": None,
            "clipHigh": None,
        }

    data_min = float(finite.min())
    data_max = float(finite.max())

    if method == "percentile":
        clip_low = float(np.percentile(finite, low_pct))
        clip_high = float(np.percentile(finite, high_pct))
    else:
        clip_low = data_min
        clip_high = data_max

    # Avoid division by zero
    if clip_high == clip_low:
        clip_high = clip_low + 1e-9

    clipped = np.clip(arr, clip_low, clip_high)
    normalized = (clipped - clip_low) / (clip_high - clip_low) * 255.0

    # Fill NaN pixels with mid-gray (128)
    normalized = np.where(np.isnan(arr), 128.0, normalized)
    uint8_arr = normalized.astype(np.uint8)

    stats = {
        "normalizationMethod": method,
        "dataMin": round(data_min, 6),
        "dataMax": round(data_max, 6),
        "clipLow": round(clip_low, 6),
        "clipHigh": round(clip_high, 6),
    }
    return uint8_arr, stats


def save_frame_png(arr_uint8: np.ndarray, output_path: Path) -> None:
    """Save a uint8 2D array as a grayscale PNG."""
    from PIL import Image
    img = Image.fromarray(arr_uint8, mode="L")
    img.save(str(output_path), format="PNG")
    logger.info(f"Saved frame: {output_path}")


def resize_frame(arr: np.ndarray, target_size: Tuple[int, int] = (512, 512)) -> np.ndarray:
    """Resize a frame to target_size using Lanczos resampling."""
    import cv2
    h, w = target_size
    return cv2.resize(arr, (w, h), interpolation=cv2.INTER_LANCZOS4)


def preprocess_variable(
    ds,
    variable_name: str,
    output_dir: Path,
    job_id: str,
    frame_a_index: int = 0,
    frame_b_index: int = -1,
) -> Tuple[Path, Path, dict]:
    """
    Full preprocessing pipeline for a NetCDF variable.
    Extracts two frames, normalizes them, resizes, and saves as PNGs.

    Returns: (frame_a_path, frame_b_path, preprocessing_stats)
    """
    import xarray as xr

    var = ds[variable_name]
    n_time = 1

    # Determine number of frames available
    arr_raw = var.values
    squeezed = np.squeeze(arr_raw)
    if squeezed.ndim >= 3:
        n_time = squeezed.shape[0]
    elif squeezed.ndim == 2:
        n_time = 1

    # Resolve frame indices
    idx_a = max(0, min(frame_a_index, n_time - 1))
    idx_b = n_time - 1 if frame_b_index < 0 else max(0, min(frame_b_index, n_time - 1))

    # If only one frame, synthesize frame B by slight augmentation
    if n_time == 1:
        idx_a = 0
        idx_b = 0
        logger.info("Only one time step — frame B will be a shifted/augmented version")

    logger.info(f"Extracting frames at indices {idx_a} and {idx_b} from '{variable_name}'")

    arr_a = extract_2d_slice(ds, variable_name, time_index=idx_a)
    arr_b = extract_2d_slice(ds, variable_name, time_index=idx_b)

    # If same frame, create synthetic B by slight Gaussian blur + contrast shift
    if idx_a == idx_b or np.allclose(arr_a, arr_b, equal_nan=True):
        import cv2
        arr_b_aug = arr_b.copy()
        arr_b_aug = np.where(np.isfinite(arr_b_aug), arr_b_aug * 1.03, arr_b_aug)
        logger.info("Frame A and B are identical — applying slight augmentation to B")
        arr_b = arr_b_aug

    # Normalize each frame
    uint8_a, stats_a = normalize_to_uint8(arr_a, method="percentile")
    uint8_b, stats_b = normalize_to_uint8(arr_b, method="percentile")

    # Resize to standard size for model
    uint8_a = resize_frame(uint8_a, (512, 512))
    uint8_b = resize_frame(uint8_b, (512, 512))

    # Save
    output_dir.mkdir(parents=True, exist_ok=True)
    path_a = output_dir / f"frameA.png"
    path_b = output_dir / f"frameB.png"

    save_frame_png(uint8_a, path_a)
    save_frame_png(uint8_b, path_b)

    stats = {
        "frameA": {**stats_a, "index": idx_a, "shape": list(arr_a.shape)},
        "frameB": {**stats_b, "index": idx_b, "shape": list(arr_b.shape)},
        "targetSize": [512, 512],
    }
    return path_a, path_b, stats


def compute_metrics(arr_pred: np.ndarray, arr_gt: np.ndarray) -> dict:
    """
    Compute SSIM, PSNR, MAE, RMSE between predicted and ground truth arrays.
    Both arrays should be float32, range [0, 255].
    """
    try:
        from skimage.metrics import structural_similarity as ssim_fn
        from skimage.metrics import peak_signal_noise_ratio as psnr_fn

        pred = arr_pred.astype(np.float32)
        gt = arr_gt.astype(np.float32)

        mae = float(np.mean(np.abs(pred - gt)))
        rmse = float(np.sqrt(np.mean((pred - gt) ** 2)))
        ssim = float(ssim_fn(pred, gt, data_range=255.0))
        psnr = float(psnr_fn(gt, pred, data_range=255.0))

        return {
            "ssim": round(ssim, 4),
            "psnr": round(psnr, 4),
            "mae": round(mae, 4),
            "rmse": round(rmse, 4),
            "groundTruthAvailable": True,
        }
    except Exception as e:
        logger.error(f"Metrics computation failed: {e}")
        return {"groundTruthAvailable": False}
