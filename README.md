# 🛰️ ISRO Satellite Frame Interpolation

An AI-powered satellite frame interpolation system for NetCDF weather datasets using the RIFE neural network. The project reconstructs intermediate satellite frames from temporal observations and provides an interactive visualization and validation interface.

## 🚀 Overview

Satellite observations are often captured at discrete time intervals. This project uses deep learning-based frame interpolation to generate intermediate frames between two satellite observations, enabling smoother temporal reconstruction and analysis of weather patterns.

The system processes NetCDF (`.nc`) satellite datasets, extracts temporal frames, applies preprocessing and normalization, runs RIFE inference, and visualizes the generated results through a modern mission-control-inspired interface.

## ✨ Features

* Upload and process NetCDF satellite datasets
* Automatic variable detection and dataset inspection
* Temporal frame extraction
* AI-powered interpolation using RIFE
* Interactive frame comparison slider
* Telemetry and validation dashboard
* Engineering trace and processing pipeline visualization
* Export generated results
* Support for real satellite weather imagery

## 🏗️ System Architecture

```text
NetCDF Dataset
       │
       ▼
Dataset Inspection
       │
       ▼
Preprocessing & Normalization
       │
       ▼
Frame Extraction
       │
       ▼
RIFE Neural Network
       │
       ▼
Interpolated Frame
       │
       ▼
Visualization & Validation
```

## 🛠️ Tech Stack

### Frontend

* React
* TypeScript
* Vite
* Tailwind CSS
* Modern Mission-Control UI Design

### Backend

* Python
* FastAPI
* Uvicorn

### AI / Data Processing

* PyTorch
* RIFE (Real-Time Intermediate Flow Estimation)
* NumPy
* OpenCV
* Xarray
* NetCDF4

## 📂 Project Structure

```text
backend/
│
├── app/
│   ├── api/
│   ├── services/
│   ├── schemas/
│   └── core/
│
├── data/
│   ├── uploads/
│   ├── outputs/
│   └── previews/
│
├── models/
│   └── rife_checkpoint.pth
│
└── requirements.txt

frontend/
│
├── src/
├── components/
├── pages/
└── assets/
```

## ⚙️ Installation

### Clone Repository

```bash
git clone https://github.com/your-username/ISRO-Satellite-Frame-Interpolation.git
cd ISRO-Satellite-Frame-Interpolation
```

### Backend Setup

```bash
pip install -r backend/requirements.txt
```

### Start Backend

```bash
python -m uvicorn backend.app.main:app --reload
```

Backend runs on:

```text
http://127.0.0.1:8000
```

### Frontend Setup

```bash
pnpm install
```

or

```bash
npm install
```

### Start Frontend

```bash
pnpm dev
```

or

```bash
npm run dev
```

Frontend runs on:

```text
http://localhost:5173
```

## 🧠 Model

This project uses:

**RIFE (Real-Time Intermediate Flow Estimation)**

The model predicts an intermediate frame between two temporal satellite observations.

Example:

```text
Frame A (15:00)
      +
Frame B (15:30)
      ↓

Generated Frame (15:15)
```

## 📊 Validation Approach

The recommended validation workflow:

```text
Real Frame A (15:00)
Real Frame GT (15:15)
Real Frame B (15:30)

Input:
A + B

Output:
Generated 15:15

Comparison:
Generated 15:15 vs Real 15:15
```

Potential metrics:

* SSIM
* PSNR
* MSE
* MAE

## 🌍 Use Cases

* Weather monitoring
* Cloud motion analysis
* Temporal reconstruction of satellite imagery
* Earth observation research
* Climate and atmospheric studies
* Remote sensing applications

## 📸 Screenshots

Add screenshots of:

* Dataset Inspector
* Interpolation Pipeline
* Visual Inspection View
* Telemetry & Validation Dashboard

## 🔮 Future Improvements

* Ground-truth validation metrics
* Multi-frame interpolation
* Video export support
* GPU acceleration
* Real-time satellite stream integration
* Advanced meteorological analytics

## 👨‍💻 Author

**Mandar Deshmukh**

AI & Data Science Student
Yeshwantrao Chavan College of Engineering (YCCE), Nagpur

## 📄 License

This project is intended for educational, research, and demonstration purposes.
