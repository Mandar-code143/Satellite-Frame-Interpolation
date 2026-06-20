from pydantic import BaseModel
from typing import Optional, List
from enum import Enum


class JobStage(str, Enum):
    QUEUED = "queued"
    UPLOADING = "uploading"
    INSPECTING = "inspecting"
    PREPROCESSING = "preprocessing"
    LOADING_MODEL = "loading_model"
    RUNNING_INFERENCE = "running_inference"
    GENERATING_VALIDATION = "generating_validation"
    COMPLETED = "completed"
    FAILED = "failed"


class ValidationMetrics(BaseModel):
    ssim: Optional[float] = None
    psnr: Optional[float] = None
    mae: Optional[float] = None
    rmse: Optional[float] = None
    groundTruthAvailable: bool = False


class ExplanationStep(BaseModel):
    step: int
    label: str
    description: str
    status: str  # completed | active | pending | error


class Explanation(BaseModel):
    selectedVariable: Optional[str] = None
    detectedDimensions: List[str] = []
    normalizationMethod: str = "min-max"
    interpolationMode: str = "fallback-blend"
    fallbackMode: bool = True
    confidenceIndicators: List[str] = []
    datasetNotes: List[str] = []
    steps: List[ExplanationStep] = []


class JobInput(BaseModel):
    uploadId: str
    selectedVariable: str
    frameA: Optional[int] = None
    frameB: Optional[int] = None
    demoMode: bool = False


class JobCreated(BaseModel):
    jobId: str
    status: str
    createdAt: str


class JobStatus(BaseModel):
    jobId: str
    status: str
    stage: str
    progress: float
    messages: List[str]
    error: Optional[str] = None
    completedAt: Optional[str] = None


class JobResult(BaseModel):
    jobId: str
    status: str
    frameAUrl: Optional[str] = None
    frameBUrl: Optional[str] = None
    interpolatedUrl: Optional[str] = None
    metrics: Optional[ValidationMetrics] = None
    explanation: Optional[Explanation] = None
    processingTimeMs: Optional[int] = None
    fallbackMode: bool = True


class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None
