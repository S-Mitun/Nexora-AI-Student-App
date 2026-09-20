from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


class DocumentBase(BaseModel):
    title: str = Field(..., max_length=255, description="Human-readable title for the study material")
    source_type: str = Field("pdf", description="File format: pdf, docx, pptx, txt, image")
    curriculum_id: Optional[str] = Field(None, description="Optional linked curriculum ID")
    subject_id: Optional[str] = Field(None, description="Optional linked subject ID")
    language: str = Field("en", max_length=10, description="Document language code (en, ta, te, hi)")


class DocumentCreate(DocumentBase):
    file_path: Optional[str] = Field(None, description="Internal storage path")
    file_size_bytes: int = Field(0, description="File size in bytes")
    metadata_json: Dict[str, Any] = Field(default_factory=dict)


class DocumentRead(DocumentBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    file_path: str
    file_size_bytes: int
    status: str  # queued, processing, completed, failed, retry
    version: int = 1
    progress_percent: int = 0
    processing_stage: str = "queued"
    error_message: Optional[str] = None
    page_count: int = 0
    content_hash: Optional[str] = None
    metadata_json: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime


class DocumentStatusRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    status: str
    processing_stage: str
    progress_percent: int
    error_message: Optional[str] = None
    updated_at: datetime


class DocumentUploadResponse(BaseModel):
    id: str
    title: str
    status: str = "queued"
    processing_stage: str = "queued"
    progress_percent: int = 0
    message: str
    status_url: str
