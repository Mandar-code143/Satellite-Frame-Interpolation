import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

import xarray as xr
import numpy as np

from backend.app.services.preprocessing import (
    normalize_to_uint8,
    resize_frame,
    compute_metrics
)

# ---------- LOAD FILES ----------

f1 = xr.open_dataset(
r"C:\Users\manda\Downloads\OR_ABI-L2-CMIPF-M6C13_G19_s20260090000206_e20260090009526_c20260090009579.nc"
)

f2 = xr.open_dataset(
r"C:\Users\manda\Downloads\OR_ABI-L2-CMIPF-M6C13_G19_s20260090010206_e20260090019526_c20260090019577.nc"
)

f3 = xr.open_dataset(
r"C:\Users\manda\Downloads\OR_ABI-L2-CMIPF-M6C13_G19_s20260090020206_e20260090029525_c20260090029581.nc"
)

# ---------- EXTRACT CMI ----------

img_a = f1["CMI"].values
img_truth = f2["CMI"].values
img_b = f3["CMI"].values

# ---------- NORMALIZE ----------

img_a, _ = normalize_to_uint8(img_a)
img_truth, _ = normalize_to_uint8(img_truth)
img_b, _ = normalize_to_uint8(img_b)

# ---------- RESIZE ----------

img_a = resize_frame(img_a, (512, 512))
img_truth = resize_frame(img_truth, (512, 512))
img_b = resize_frame(img_b, (512, 512))

print("Shapes:")
print(img_a.shape)
print(img_truth.shape)
print(img_b.shape)

# ---------- SIMPLE BASELINE ----------

pred = (
    (
        img_a.astype(np.float32)
        +
        img_b.astype(np.float32)
    ) / 2
).astype(np.uint8)

# ---------- METRICS ----------

metrics = compute_metrics(pred, img_truth)

print("\nMETRICS")
print(metrics)