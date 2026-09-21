from datetime import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, ConfigDict, Field


class SyllabusVersionRead(BaseModel):
    id: str
    syllabus_id: str
    version_number: int
    document_id: Optional[str] = None
    raw_extracted_json: Optional[Dict[str, Any]] = None
    is_active: bool
    activated_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SyllabusBase(BaseModel):
    title: str = Field(..., min_length=2, max_length=255)
    academic_level: str = Field(..., min_length=2, max_length=50)
    institution: Optional[str] = None
    program_degree: Optional[str] = None
    academic_year: Optional[str] = None


class SyllabusCreate(SyllabusBase):
    pass


class SyllabusRead(SyllabusBase):
    id: str
    user_id: str
    status: str
    created_at: datetime
    updated_at: datetime
    active_version: Optional[SyllabusVersionRead] = None
    versions: List[SyllabusVersionRead] = []

    model_config = ConfigDict(from_attributes=True)


class SyllabusActivateRequest(BaseModel):
    version_id: Optional[str] = None
    confirmed: bool = True
