from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class ActivityLogCreate(BaseModel):
    action_type: Optional[str] = Field(None, max_length=50)
    activity_type: Optional[str] = Field(None, max_length=50)
    title: str = Field(..., max_length=255, description="Human readable description of the learning milestone")
    entity_type: str = Field("workspace", max_length=50, description="subject, module, lesson, note, material, practice, lab, workspace")
    entity_id: Optional[str] = Field(None, max_length=100)
    academic_level: Optional[str] = Field(None, description="Academic level; defaults to student's active level if omitted")
    curriculum_id: Optional[str] = None
    subject_id: Optional[str] = None
    module_id: Optional[str] = None
    lesson_id: Optional[str] = None
    concept_id: Optional[str] = None
    metadata_json: Dict[str, Any] = Field(default_factory=dict)
    meta: Optional[Dict[str, Any]] = None


class ActivityLogRead(BaseModel):
    id: str
    user_id: str
    academic_level: str
    action_type: str
    title: str
    entity_type: str
    entity_id: Optional[str] = None
    subject_id: Optional[str] = None
    module_id: Optional[str] = None
    lesson_id: Optional[str] = None
    concept_id: Optional[str] = None
    metadata_json: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    time_ago: Optional[str] = None

    model_config = {"from_attributes": True}


class ActivityFeedResponse(BaseModel):
    academic_level: str
    activities: List[ActivityLogRead] = Field(default_factory=list)
    total_count: int = 0
