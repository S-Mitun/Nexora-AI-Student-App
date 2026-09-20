from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


# ==============================================================================
# 1. Lesson Schemas (Level 5)
# ==============================================================================

class LessonBase(BaseModel):
    title: str
    slug: str
    content_type: str = "explanation"  # explanation, example, definition, key_points, visual, exercise, reading
    order_index: int = 0
    estimated_minutes: int = 5
    is_active: bool = True


class LessonRead(LessonBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    module_id: str


class LessonDetailRead(LessonRead):
    content: str
    module_title: Optional[str] = None
    concept_name: Optional[str] = None
    concept_slug: Optional[str] = None
    subject_name: Optional[str] = None
    subject_slug: Optional[str] = None
    previous_lesson_slug: Optional[str] = None
    next_lesson_slug: Optional[str] = None
    personalized_context: Optional[Dict[str, Any]] = None


# ==============================================================================
# 2. Learning Module Schemas (Level 4)
# ==============================================================================

class LearningModuleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    concept_id: str
    title: str
    slug: str = ""
    description: Optional[str] = None
    learning_objective: Optional[str] = None
    difficulty_level: str = "intermediate"
    estimated_minutes: int = 15
    order_index: int = 0
    is_active: bool = True
    why_it_matters: str = ""
    simple_explanation: str = ""
    technical_explanation: str = ""
    visualization_type: str = "interactive-canvas"
    experiment_type: str = "parameter-tuning"
    simulation_config: Dict[str, Any] = Field(default_factory=dict)
    application_notes: str = ""
    prerequisites: List[str] = Field(default_factory=list)
    lessons: List[LessonRead] = Field(default_factory=list)


class LearningModuleSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    concept_id: str
    title: str
    slug: str
    description: Optional[str] = None
    learning_objective: Optional[str] = None
    difficulty_level: str = "intermediate"
    estimated_minutes: int = 15
    order_index: int = 0
    lesson_count: int = 0
    prerequisites: List[str] = Field(default_factory=list)


class LearningModuleDetail(LearningModuleRead):
    lessons: List[LessonRead] = Field(default_factory=list)
    concept_name: Optional[str] = None
    concept_slug: Optional[str] = None
    subject_name: Optional[str] = None
    subject_slug: Optional[str] = None


# ==============================================================================
# 3. Concept Schemas (Level 3)
# ==============================================================================

class ConceptBase(BaseModel):
    name: str
    slug: str
    summary: str
    short_description: Optional[str] = None
    difficulty: str = "intermediate"
    difficulty_level: str = "intermediate"
    order_index: int = 0
    is_active: bool = True


class ConceptRead(ConceptBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    topic_id: str
    module_count: int = 0
    has_simulation: bool = False
    has_visualization: bool = False
    has_practice: bool = True
    has_lab: bool = False
    has_mindmap: bool = True
    learning_modes: List[str] = Field(default_factory=lambda: ["learn", "ask", "practice", "notes"])


class ConceptDetail(ConceptRead):
    modules: List[LearningModuleSummary] = Field(default_factory=list)
    topic_name: Optional[str] = None
    topic_slug: Optional[str] = None
    subject_name: Optional[str] = None
    subject_slug: Optional[str] = None


# ==============================================================================
# 4. Topic Schemas (Level 2)
# ==============================================================================

class TopicRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    subject_id: str
    name: str
    slug: str
    description: Optional[str] = None
    order_index: int = 0
    is_active: bool = True
    concepts: List[ConceptRead] = Field(default_factory=list)
    concept_count: int = 0


class TopicDetail(TopicRead):
    concepts: List[ConceptRead] = Field(default_factory=list)
    subject_name: Optional[str] = None
    subject_slug: Optional[str] = None


# ==============================================================================
# 5. Curriculum & Subject Schemas (Level 0 & 1)
# ==============================================================================

class CurriculumRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    code: str
    name: str
    board_authority: str
    education_level: str
    country: str = "India"
    description: Optional[str] = None
    is_active: bool = True


class SubjectRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    curriculum_id: Optional[str] = None
    name: str
    slug: str
    description: Optional[str] = None
    icon: str = "BookOpen"
    category: str = "Computer Science & Engineering"
    difficulty_level: str = "all-levels"
    education_level: str = "all-levels"
    academic_domain: str = "General"
    is_system: bool = True
    is_enrolled: bool = False
    order_index: int = 0
    is_active: bool = True
    topic_count: int = 0
    concept_count: int = 0
    topics: List[TopicRead] = Field(default_factory=list)


class SubjectDetail(SubjectRead):
    topics: List[TopicDetail] = Field(default_factory=list)
    curriculum: Optional[CurriculumRead] = None


class StudentSubjectRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    user_id: str
    subject_id: str
    enrollment_source: str = "student_selected"
    is_active: bool = True
    subject: Optional[SubjectRead] = None


class StudentSubjectCreate(BaseModel):
    subject_id: str
    enrollment_source: str = "student_selected"


# ==============================================================================
# 6. Experiential & Personalization Blueprints (Prompts 01-04 Compatibility)
# ==============================================================================

class ConceptExploreRequest(BaseModel):
    query: str = Field(..., min_length=2, max_length=200, description="Concept or question the student wants to understand")
    subject_hint: Optional[str] = Field(None, description="Optional subject domain hint")
    interest_hint: Optional[str] = Field(None, description="Optional student interest domain (e.g. Gaming, Cricket, Cars)")


class InteractiveSimulationSpec(BaseModel):
    simulation_type: str = Field(..., description="E.g., wave_compression, tree_traversal, kernel_filter")
    parameters: Dict[str, Any] = Field(default_factory=dict)
    controls: List[Dict[str, Any]] = Field(default_factory=list)


class ConceptExploreResponse(BaseModel):
    concept: str
    domain: str
    tagline: str
    why_it_matters: str
    simple_explanation: str
    technical_explanation: str
    simulation: InteractiveSimulationSpec
    practical_application: str
    quick_check_question: str
    quick_check_options: List[str]
    quick_check_answer_index: int
    personalized_context: Optional[Dict[str, Any]] = Field(None, description="Active tailored contextual perspective")
    available_perspectives: List[Dict[str, Any]] = Field(default_factory=list, description="All available interest perspectives for this concept")
