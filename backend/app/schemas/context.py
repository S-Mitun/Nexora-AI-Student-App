from typing import List, Optional, Dict, Any
from enum import Enum
from pydantic import BaseModel, Field
from datetime import datetime


class KnowledgeSourceType(str, Enum):
    """Knowledge provenance categories establishing trust and retrieval hierarchy."""
    BASELINE = "baseline"
    OFFICIAL_CURRICULUM = "official_curriculum"
    OPEN_EDUCATIONAL = "open_educational"
    LICENSED_CONTENT = "licensed_content"
    USER_UPLOAD = "user_upload"
    APPROVED_EXTERNAL = "approved_external"


class KnowledgeScope(BaseModel):
    """Flags indicating which knowledge layers are active for retrieval and resolution."""
    baseline: bool = Field(True, description="Common level baseline curriculum knowledge")
    board_overlay: bool = Field(True, description="Board-specific curriculum prescription")
    user_materials: bool = Field(True, description="Student-uploaded academic materials")
    external_verified: bool = Field(False, description="Approved external educational sources")


class AcademicContextResponse(BaseModel):
    """
    Centralized Academic Context Model.
    Unifies authenticated student profile, academic level, board overlay,
    enrolled subjects, active materials, and learning scopes.
    """
    user_id: str
    context_id: str = Field(..., description="Canonical deterministic context partition identifier (e.g., class_6_10:cbse:class_10)")
    context_fingerprint: str = Field(..., description="Verification hash/fingerprint of resolved context parameters")
    academic_level: str = Field(..., description="Normalized academic level (e.g. class_1_5, class_6_10, class_11_12, undergraduate, postgraduate)")
    education_category: str = Field(..., description="UI category (primary, secondary, higher_secondary, undergraduate, postgraduate, research, custom)")
    
    # Board & Curriculum overlay
    curriculum_id: Optional[str] = None
    curriculum_code: Optional[str] = None
    curriculum_name: Optional[str] = None
    board_authority: Optional[str] = None
    board_type: Optional[str] = None  # national_board, state_board, international_board, university_degree, research, custom
    
    # Secondary academic attributes
    grade_level: str = Field("Class 10", description="Specific grade or class (e.g. Class 4, Class 10, Year 2)")
    academic_domain: str = Field("General Studies", description="Academic stream or focus area")
    state_region: Optional[str] = None
    stream: Optional[str] = None
    program: Optional[str] = None
    
    # Higher Education attributes
    degree: Optional[str] = None
    department: Optional[str] = None
    specialization: Optional[str] = None
    academic_year: Optional[str] = None
    institution: Optional[str] = None
    
    # Student preferences & language
    preferred_language: str = "en"
    learning_preferences: List[str] = Field(default_factory=lambda: ["visual", "practical", "step_by_step"])
    
    # Active learning pointers
    active_subject_id: Optional[str] = None
    active_subject_slug: Optional[str] = None
    active_subject_name: Optional[str] = None
    active_topic_slug: Optional[str] = None
    active_concept_slug: Optional[str] = None
    
    # Scoped entity identifiers
    enrolled_subject_ids: List[str] = Field(default_factory=list)
    available_material_ids: List[str] = Field(default_factory=list)
    
    # Knowledge scope
    knowledge_scope: KnowledgeScope = Field(default_factory=KnowledgeScope)
    
    resolved_at: datetime = Field(default_factory=datetime.utcnow)


class KnowledgeSourceRead(BaseModel):
    """Metadata schema representing an academic knowledge source."""
    source_id: str
    source_type: KnowledgeSourceType
    title: str
    language: str = "en"
    academic_level: str
    board: Optional[str] = None
    subject_id: Optional[str] = None
    topic_id: Optional[str] = None
    concept_id: Optional[str] = None
    license_status: str = "curriculum_metadata"
    trust_priority: int = Field(1, description="Higher priority takes precedence in conflict resolution")
    owner_user_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class AcademicAnswerSection(BaseModel):
    """Structured modular section within a standardized educational response."""
    section_id: str
    title: str
    content: str
    latex_formulas: List[str] = Field(default_factory=list)
    is_applicable: bool = True


class AcademicAnswerResponse(BaseModel):
    """
    Standardized Academic Content & Answer Contract.
    Supports up to 17 modular pedagogical sections tailored by academic level and context.
    Free from hallucinated citations and unsupported claims.
    """
    concept_name: str
    academic_level: str
    subject: str
    evidence_level: str = Field("supported_by_source", description="supported_by_source | general_knowledge | insufficient_evidence")
    
    # Modular Sections
    what_it_is: Optional[str] = None
    problem_it_solves: Optional[str] = None
    why_it_matters: Optional[str] = None
    why_where_needed: Optional[str] = None
    how_it_works: Optional[str] = None
    inputs: Optional[str] = None
    process: Optional[str] = None
    output: Optional[str] = None
    key_components: List[str] = Field(default_factory=list)
    example: Optional[str] = None
    real_world_application: Optional[str] = None
    impact_and_use: Optional[str] = None
    limitations: Optional[str] = None
    common_mistakes: List[str] = Field(default_factory=list)
    related_concepts: List[str] = Field(default_factory=list)
    prerequisites: List[str] = Field(default_factory=list)
    exam_assessment_angle: Optional[str] = None
    
    # Source Citations
    citations: List[Dict[str, Any]] = Field(default_factory=list)
    generated_at: datetime = Field(default_factory=datetime.utcnow)
