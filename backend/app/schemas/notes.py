from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class NoteBase(BaseModel):
    title: str = Field(..., max_length=255, description="Title of the student note")
    content: str = Field(..., description="Markdown note text and mathematical formulas")
    academic_level: str = Field("undergraduate", description="Normalized academic level (e.g. class_1_5, class_6_10, class_11_12, undergraduate, postgraduate)")
    subject_id: Optional[str] = Field(None, description="Linked academic subject ID")
    concept_id: Optional[str] = Field(None, description="Linked academic concept ID")
    module_id: Optional[str] = Field(None, description="Linked learning module ID")
    lesson_id: Optional[str] = Field(None, description="Linked lesson ID")
    source_reference: Optional[str] = Field(None, max_length=255, description="Citation or textbook reference")
    tags: list = Field(default_factory=list, description="Categorization tags")
    is_pinned: bool = Field(False, description="Whether pinned to top")
    is_archived: bool = Field(False, description="Whether archived")


class NoteCreate(NoteBase):
    pass


class NoteUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=255)
    content: Optional[str] = None
    subject_id: Optional[str] = None
    concept_id: Optional[str] = None
    module_id: Optional[str] = None
    lesson_id: Optional[str] = None
    source_reference: Optional[str] = None
    tags: Optional[list] = None
    is_pinned: Optional[bool] = None
    is_archived: Optional[bool] = None


class NoteRead(NoteBase):
    id: str
    user_id: str
    subject_name: Optional[str] = None
    concept_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
