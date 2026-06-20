"""
NetCDF dataset inspection service.
Accepts a .nc file path and returns structured metadata without assuming
any specific variable names.
"""
import numpy as np
from pathlib import Path
from typing import List, Dict, Optional, Tuple
import logging

logger = logging.getLogger(__name__)


def _safe_float(val) -> Optional[float]:
    try:
        f = float(val)
        if np.isnan(f) or np.isinf(f):
            return None
        return f
    except Exception:
        return None


def _score_variable(name: str, dims: List[str], shape: List[int], dtype: str) -> Tuple[float, str]:
    """
    Score a variable for how likely it is to be a visualizable 2D spatial field.
    Returns (score, reason). Higher score = better candidate.
    """
    score = 0.0
    reasons = []

    # Must have at least 2 dimensions
    if len(shape) < 2:
        return -1.0, "Not enough dimensions for 2D visualization"

    # Prefer variables with lat/lon-like dimensions
    dim_names_lower = [d.lower() for d in dims]
    spatial_hints = ["lat", "lon", "x", "y", "row", "col", "pixel", "line", "scan", "along", "cross"]
    spatial_count = sum(1 for d in dim_names_lower if any(h in d for h in spatial_hints))

    if spatial_count >= 2:
        score += 3.0
        reasons.append("Has spatial lat/lon dimensions")
    elif spatial_count == 1:
        score += 1.0
        reasons.append("Has one spatial dimension")

    # Prefer float data (scientific measurements)
    if "float" in dtype.lower():
        score += 1.5
        reasons.append("Float dtype (scientific data)")
    elif "int" in dtype.lower():
        score += 0.5
        reasons.append("Integer dtype")

    # Penalize very small arrays
    total_size = 1
    for s in shape:
        total_size *= s
    if total_size < 100:
        score -= 2.0
        reasons.append("Too small to visualize")
    elif total_size > 100:
        score += 0.5

    # Prefer names with scientific hints
    name_lower = name.lower()
    scientific_hints = [
        "temp", "tir", "vis", "ir", "band", "channel", "radiance", "brightness",
        "reflectance", "albedo", "cloud", "aerosol", "precip", "rain", "wind",
        "pressure", "humidity", "sst", "lst", "ndvi", "evi", "bt", "tb"
    ]
    if any(h in name_lower for h in scientific_hints):
        score += 2.0
        reasons.append("Name suggests scientific measurement")

    # Prefer 2D or 3D arrays (not 1D coordinate arrays)
    if len(shape) == 2:
        score += 1.0
        reasons.append("Pure 2D spatial field")
    elif len(shape) == 3:
        score += 0.5
        reasons.append("3D with time/channel axis")

    reason = "; ".join(reasons) if reasons else "General data variable"
    return score, reason


def inspect_netcdf(file_path: Path) -> Dict:
    """
    Inspect a NetCDF file and return structured metadata.
    Uses xarray for robust multi-format support.
    """
    import xarray as xr

    try:
        ds = xr.open_dataset(str(file_path), engine="netcdf4", mask_and_scale=False)
    except Exception as e:
        logger.error(f"Failed to open NetCDF with netcdf4 engine: {e}")
        try:
            ds = xr.open_dataset(str(file_path), engine="scipy")
        except Exception as e2:
            raise ValueError(f"Cannot open file as NetCDF: {e2}")

    try:
        result = _extract_metadata(ds, file_path)
    finally:
        ds.close()

    return result


def _extract_metadata(ds, file_path: Path) -> Dict:
    import xarray as xr

    variables_info = []
    candidate_variables = []

    # Extract dimensions
    dimensions = {k: int(v) for k, v in ds.dims.items()}

    # Extract coordinate names
    coordinates = list(ds.coords.keys())

    # Detect time steps
    time_steps = 0
    has_time_axis = False
    for dim_name in ds.dims:
        if "time" in dim_name.lower() or dim_name.lower() == "t":
            has_time_axis = True
            time_steps = int(ds.dims[dim_name])
            break

    # Global attributes
    global_attrs = {}
    for k, v in ds.attrs.items():
        try:
            global_attrs[str(k)] = str(v)[:200]
        except Exception:
            pass

    # Process each variable
    for var_name in ds.data_vars:
        var = ds[var_name]
        shape = list(var.shape)
        dims = list(var.dims)
        dtype = str(var.dtype)

        # Compute stats safely
        nan_count = 0
        min_val = None
        max_val = None

        try:
            arr = var.values
            finite_mask = np.isfinite(arr)
            nan_count = int(np.sum(~finite_mask))
            if finite_mask.any():
                min_val = _safe_float(arr[finite_mask].min())
                max_val = _safe_float(arr[finite_mask].max())
        except Exception as e:
            logger.warning(f"Could not compute stats for {var_name}: {e}")

        units = None
        long_name = None
        try:
            units = str(var.attrs.get("units", var.attrs.get("unit", None)))
            if units == "None":
                units = None
        except Exception:
            pass
        try:
            long_name = str(var.attrs.get("long_name", var.attrs.get("standard_name", None)))
            if long_name == "None":
                long_name = None
        except Exception:
            pass

        var_info = {
            "name": var_name,
            "dtype": dtype,
            "shape": shape,
            "dims": dims,
            "minVal": min_val,
            "maxVal": max_val,
            "nanCount": nan_count,
            "units": units,
            "longName": long_name,
        }
        variables_info.append(var_info)

        # Score this variable as a visualization candidate
        score, reason = _score_variable(var_name, dims, shape, dtype)
        if score > 0:
            candidate_variables.append({
                "name": var_name,
                "score": round(score, 2),
                "reason": reason,
            })

    # Sort candidates by score descending
    candidate_variables.sort(key=lambda x: x["score"], reverse=True)

    # Build explanation
    n_vars = len(variables_info)
    n_candidates = len(candidate_variables)
    top_candidate = candidate_variables[0]["name"] if candidate_variables else "none"

    explanation = (
        f"Dataset contains {n_vars} variable(s) across {len(dimensions)} dimension(s). "
        f"{n_candidates} variable(s) are suitable for 2D spatial visualization. "
        f"Top candidate is '{top_candidate}'. "
    )
    if has_time_axis:
        explanation += f"Time axis detected with {time_steps} time step(s). "

    file_size = file_path.stat().st_size

    return {
        "filename": file_path.name,
        "fileSizeBytes": file_size,
        "variables": variables_info,
        "dimensions": dimensions,
        "coordinates": coordinates,
        "timeSteps": time_steps,
        "hasTimeAxis": has_time_axis,
        "candidateVariables": candidate_variables,
        "explanation": explanation,
        "globalAttributes": global_attrs,
    }
