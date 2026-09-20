from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class PracticeQuestionRead(BaseModel):
    id: str
    practice_set_id: str
    lesson_id: Optional[str] = None
    concept_id: Optional[str] = None
    question_text: str
    question_type: str = "multiple_choice"
    options: List[str] = Field(default_factory=list)
    correct_index: Optional[int] = None  # Hidden or included depending on submission state
    explanation: Optional[str] = None
    difficulty: str = "intermediate"
    points: int = 10
    order_index: int = 0

    model_config = {"from_attributes": True}


class PracticeSetRead(BaseModel):
    id: str
    lesson_id: Optional[str] = None
    concept_id: Optional[str] = None
    module_id: Optional[str] = None
    subject_id: Optional[str] = None
    subject_name: Optional[str] = None
    academic_level: str
    title: str
    description: Optional[str] = None
    difficulty: str = "intermediate"
    questions_count: int = 5
    questions: List[PracticeQuestionRead] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class PracticeSubmission(BaseModel):
    practice_set_id: str
    answers: Dict[str, int] = Field(..., description="Mapping of question_id to chosen option index")


class QuestionResultDetail(BaseModel):
    question_id: str
    question_text: str
    chosen_index: Optional[int]
    correct_index: int
    is_correct: bool
    explanation: str
    points_earned: int


class PracticeResultRead(BaseModel):
    practice_set_id: str
    academic_level: str
    score: int
    total_points: int
    total_questions: int
    correct_count: int
    accuracy_percent: float
    breakdown: List[QuestionResultDetail] = Field(default_factory=list)
    completed_at: datetime = Field(default_factory=datetime.utcnow)
