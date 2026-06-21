import cv2
import numpy as np

img1 = cv2.imread(
r"C:\Users\manda\Downloads\Asset-Manager-1\backend\data\outputs\e7e87af2-113\frameA.png"
)

img2 = cv2.imread(
r"C:\Users\manda\Downloads\Asset-Manager-1\backend\data\outputs\e7e87af2-113\frameB.png"
)

print(
    "Difference:",
    np.mean(
        np.abs(
            img1.astype(np.float32) -
            img2.astype(np.float32)
        )
    )
)