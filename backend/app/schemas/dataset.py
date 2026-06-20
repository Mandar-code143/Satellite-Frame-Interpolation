from pydantic import BaseModel
from typing import Optional, List, Dict, Any


class VariableInfo(BaseModel):
    name: str
    dtype: str
    shape: List[int]
    dims: List[str]
    minVal: Optional[float] = None
    maxVal: Optional[float] = None
    nanCount: int = 0
    units: Optional[str] = None
    longName: Optional[str] = None


class CandidateVariable(BaseModel):
    name: str
    score: float
    reason: str


class DatasetMetadata(BaseModel):
    filename: str
    fileSizeBytes: int
    variables: List[VariableInfo]
    dimensions: Dict[str, int]
    coordinates: List[str]
    timeSteps: int
    hasTimeAxis: bool
    candidateVariables: List[CandidateVariable]
    explanation: str
    globalAttributes: Dict[str, str] = {}
