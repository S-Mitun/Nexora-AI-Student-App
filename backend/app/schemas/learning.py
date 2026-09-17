from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


class ConceptBase(BaseModel):
    name: str
    slug: str
    summary: str
    difficulty: str = "intermediate"


class ConceptRead(ConceptBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    topic_id: str


class LearningModuleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    concept_id: str
    title: str
    why_it_matters: str
    simple_explanation: str
    technical_explanation: str
    visualization_type: str
    experiment_type: str
    simulation_config: Dict[str, Any] = Field(default_factory=dict)
    application_notes: str
    prerequisites: List[str] = Field(default_factory=list)


class TopicRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    subject_id: str
    name: str
    slug: str
    description: Optional[str] = None
    concepts: List[ConceptRead] = Field(default_factory=list)


class SubjectRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    slug: str
    description: Optional[str] = None
    icon: str
    topics: List[TopicRead] = Field(default_factory=list)


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

