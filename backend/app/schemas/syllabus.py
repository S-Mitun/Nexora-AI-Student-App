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
    has_draft: bool = False
    draft_id: Optional[str] = None
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


# --- Master Prompt 03R & 04R: Curriculum Draft Schemas ---

class SyllabusDraftPrerequisiteRead(BaseModel):
    id: str
    draft_id: str
    draft_subject_id: str
    source_module_id: Optional[str] = None
    target_module_id: Optional[str] = None
    source_topic_id: Optional[str] = None
    target_topic_id: Optional[str] = None
    title: str
    description: Optional[str] = None
    prerequisite_type: str = "explicit"
    confidence: str = "medium"
    evidence_text: Optional[str] = None
    review_required: bool = False

    model_config = ConfigDict(from_attributes=True)


class SyllabusDraftOutcomeRead(BaseModel):
    id: str
    outcome_type: str = "course_outcome"
    scope_level: str = "course"
    origin: str = "explicit"
    draft_module_id: Optional[str] = None
    description: str
    source_section_id: Optional[str] = None
    source_page: Optional[int] = None
    page_start: Optional[int] = None
    page_end: Optional[int] = None
    evidence_text: Optional[str] = None
    confidence: str = "high"
    review_required: bool = False
    sort_order: int = 0

    model_config = ConfigDict(from_attributes=True)


class SyllabusDraftTopicRead(BaseModel):
    id: str
    title: str
    is_lesson_candidate: bool = True
    lesson_candidate_title: Optional[str] = None
    source_section_id: Optional[str] = None
    source_page: Optional[int] = None
    page_start: Optional[int] = None
    page_end: Optional[int] = None
    evidence_text: Optional[str] = None
    confidence: str = "high"
    review_required: bool = False
    is_ambiguous: bool = False
    ambiguity_reason: Optional[str] = None
    sort_order: int = 0

    model_config = ConfigDict(from_attributes=True)


class SyllabusDraftModuleRead(BaseModel):
    id: str
    title: str
    display_label: str = "Unit"
    source_section_id: Optional[str] = None
    source_page: Optional[int] = None
    page_start: Optional[int] = None
    page_end: Optional[int] = None
    evidence_text: Optional[str] = None
    confidence: str = "high"
    review_required: bool = False
    is_ambiguous: bool = False
    sort_order: int = 0
    topics: List[SyllabusDraftTopicRead] = []
    outcomes: List[SyllabusDraftOutcomeRead] = []

    model_config = ConfigDict(from_attributes=True)


class SyllabusDraftSubjectRead(BaseModel):
    id: str
    name: str
    code: Optional[str] = None
    credits: Optional[str] = None
    semester: Optional[str] = None
    source_section_id: Optional[str] = None
    source_page: Optional[int] = None
    page_start: Optional[int] = None
    page_end: Optional[int] = None
    evidence_text: Optional[str] = None
    confidence: str = "high"
    review_required: bool = False
    is_ambiguous: bool = False
    sort_order: int = 0
    modules: List[SyllabusDraftModuleRead] = []
    outcomes: List[SyllabusDraftOutcomeRead] = []
    prerequisites: List[SyllabusDraftPrerequisiteRead] = []

    model_config = ConfigDict(from_attributes=True)


class SyllabusCurriculumDraftRead(BaseModel):
    id: str
    syllabus_version_id: str
    syllabus_id: str
    title: str
    academic_level: str
    institution: Optional[str] = None
    raw_text_summary: Optional[str] = None
    overall_confidence: str = "high"
    status: str = "review_required"
    compilation_status: str = "draft_ready"
    compilation_version: int = 1
    compilation_error: Optional[str] = None
    compiled_at: Optional[datetime] = None
    subjects: List[SyllabusDraftSubjectRead] = []
    prerequisites: List[SyllabusDraftPrerequisiteRead] = []
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SyllabusProcessingJobRead(BaseModel):
    id: str
    syllabus_id: Optional[str] = None
    version_id: Optional[str] = None
    syllabus_version_id: Optional[str] = None
    status: str  # queued, extracting, analyzing, completed, failed
    stage: str
    error_message: Optional[str] = None
    progress_percent: int = 0
    total_pages: int = 0
    processed_pages: int = 0
    started_at: datetime
    completed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class SyllabusProcessRequest(BaseModel):
    force_reprocess: bool = False


class SyllabusCompileRequest(BaseModel):
    force_recompile: bool = False


class SyllabusCompilationResult(BaseModel):
    draft_id: str
    syllabus_version_id: str
    compilation_status: str = "draft_ready"
    compilation_version: int = 1
    subject_count: int = 0
    module_count: int = 0
    lesson_candidate_count: int = 0
    outcome_count: int = 0
    prerequisite_count: int = 0
    review_required_count: int = 0
    is_curriculum_active: bool = False
    message: str = "Curriculum draft compiled successfully. Awaiting student review before activation."

