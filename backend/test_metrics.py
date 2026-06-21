import cv2
import numpy as np

from skimage.metrics import structural_similarity as ssim
from skimage.metrics import peak_signal_noise_ratio as psnr
from sklearn.metrics import mean_squared_error

pred = cv2.imread("predicted.png", cv2.IMREAD_GRAYSCALE)
truth = cv2.imread("groundtruth.png", cv2.IMREAD_GRAYSCALE)

score_ssim = ssim(truth, pred)
score_psnr = psnr(truth, pred)

mse = mean_squared_error(
    truth.flatten(),
    pred.flatten()
)

rmse = np.sqrt(mse)

print("SSIM:", score_ssim)
print("PSNR:", score_psnr)
print("MSE :", mse)
print("RMSE:", rmse)