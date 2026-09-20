from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict
from app.schemas.learning import SubjectRead
from app.schemas.documents import DocumentRead
from app.schemas.context import AcademicContextResponse


class ProfileCompleteness(BaseModel):
    score: int = Field(..., ge=0, le=100, description="Completeness percentage 0-100")
    is_complete: bool = Field(..., description="Whether all core academic identity fields are provided")
    missing_fields: List[str] = Field(default_factory=list, description="Fields required to reach 100% academic profile completion")


class AcademicIdentity(BaseModel):
    education_level: str = "undergraduate"
    education_category: str = "undergraduate"
    grade_level: str = "Class 10"
    curriculum_id: Optional[str] = None
    curriculum_name: Optional[str] = None
    curriculum_code: Optional[str] = None
    board_authority: Optional[str] = None
    board_type: Optional[str] = None  # national_board, state_board, international_board, university_degree, research, custom
    academic_domain: str = "General Studies"
    state_region: Optional[str] = None
    stream: Optional[str] = None
    program: Optional[str] = None
    institution: Optional[str] = None
    degree: Optional[str] = None
    department: Optional[str] = None
    specialization: Optional[str] = None
    academic_year: Optional[str] = None
    preferred_language: str = "en"


class SubjectProgressRead(BaseModel):
    subject_id: str
    subject_name: str
    progress_percent: int = 0
    completed_topics_count: int = 0
    total_topics_count: int = 0


class AcademicProgressOverview(BaseModel):
    academic_level: str
    overall_progress_percent: int = 0
    completed_lessons_count: int = 0
    completed_quizzes_count: int = 0
    enrolled_subjects_count: int = 0
    study_minutes: int = 0
    subject_progress: List[SubjectProgressRead] = Field(default_factory=list)


class MaterialsSummary(BaseModel):
    total_count: int = 0
    ready_count: int = 0
    processing_count: int = 0
    failed_count: int = 0
    recent_materials: List[DocumentRead] = Field(default_factory=list)


class LearningToolStatus(BaseModel):
    id: str
    name: str
    description: str
    icon: str
    route: str
    status: str = "active"  # "active", "upcoming_prompt"
    phase_label: str = "Live"  # "Live", "Prompt 10", "Prompt 18", etc.


class WorkspaceOverview(BaseModel):
    profile_completeness: ProfileCompleteness
    academic_identity: AcademicIdentity
    academic_context: Optional[AcademicContextResponse] = None
    enrolled_subjects: List[SubjectRead] = Field(default_factory=list)
    materials_summary: MaterialsSummary
    learning_tools: List[LearningToolStatus] = Field(default_factory=list)
    starter_subjects_available: int = 0
    system_exploration_hint: str = "System reference subjects are available for exploration and do not limit your personal enrolled subjects."

