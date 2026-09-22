from datetime import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, ConfigDict, Field


class SyllabusVersionRead(BaseModel):
    id: str
    syllabus_id: str
    version_number: int
    status: str = "uploaded"
    upload_status: str = "uploaded"
    processing_status: str = "not_started"
    curriculum_status: str = "not_built"
    source_filename: Optional[str] = None
    file_size_bytes: int = 0
    mime_type: Optional[str] = None
    checksum: Optional[str] = None
    storage_path: Optional[str] = None
    error_message: Optional[str] = None
    document_id: Optional[str] = None
    raw_extracted_json: Optional[Dict[str, Any]] = None
    is_active: bool = False
    activated_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SyllabusCanonicalStateResponse(BaseModel):
    """Authoritative Canonical Syllabus State for cross-stack synchronization."""
    has_syllabus: bool
    syllabus_id: Optional[str] = None
    current_version_id: Optional[str] = None
    academic_context_id: Optional[str] = None
    upload_status: Optional[str] = None  # pending, uploaded, verified, failed
    processing_status: str = "not_started"  # not_started, processing, completed, failed
    curriculum_status: str = "none"  # none, not_built, draft, review_required, active, archived
    is_curriculum_active: bool = False
    title: Optional[str] = None
    active_version_number: Optional[int] = None
    source_filename: Optional[str] = None
    file_size_bytes: Optional[int] = None
    document_role: Optional[str] = "syllabus"
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class SyllabusBase(BaseModel):
    title: str = Field(..., min_length=2, max_length=255)
    academic_level: str = Field(..., min_length=2, max_length=50)
    academic_context_id: Optional[str] = None
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


class SyllabusUploadResponse(BaseModel):
    syllabus_id: str
    version_id: str
    document_id: str
    title: str
    filename: str
    status: str
    version_number: int
    checksum: str
    academic_context_id: Optional[str] = None
    is_duplicate: bool = False
    message: str


class SyllabusStatusRead(BaseModel):
    syllabus_id: str
    version_id: str
    status: str
    version_number: int
    is_active: bool
    error_message: Optional[str] = None
    updated_at: datetime


class SyllabusActivateRequest(BaseModel):
    version_id: Optional[str] = None
    confirmed: bool = True
