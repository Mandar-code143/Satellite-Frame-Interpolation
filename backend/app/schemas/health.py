from pydantic import BaseModel
from typing import Optional


class HealthStatus(BaseModel):
    status: str
    version: str
    timestamp: str
    modelAvailable: bool
    fallbackMode: bool
    backendReady: bool


class ModelStatus(BaseModel):
    modelExists: bool
    modelPath: str
    inferenceReady: bool
    fallbackMode: bool
    device: str
    torchVersion: Optional[str] = None
