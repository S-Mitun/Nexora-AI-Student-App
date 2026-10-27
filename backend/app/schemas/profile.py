from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field
from app.services.profile.completion_service import ProfileCompletionResult


class ProfileBase(BaseModel):
    full_name: Optional[str] = Field(None, max_length=255, description="Student's display name")
    avatar_url: Optional[str] = Field(None, max_length=1024, description="Profile picture URL")
    education_level: Optional[str] = Field(None, max_length=100, description="Academic level (class-1-5, class-6-10, class-11-12, undergraduate, postgraduate, research, custom)")
    education_category: Optional[str] = Field(None, max_length=50, description="Primary, Middle, Secondary, Higher Secondary, Undergraduate, Postgraduate, Research, Custom")
    board_type: Optional[str] = Field(None, max_length=50, description="national_board, state_board, international_board, university_degree, research, custom")
    stream: Optional[str] = Field(None, max_length=100, description="Academic stream (e.g. Science PCM, Science PCB, Commerce, Arts)")
    program: Optional[str] = Field(None, max_length=100, description="University program (e.g. B.Tech, B.Sc, M.S.)")
    curriculum_id: Optional[str] = Field(None, description="Enrolled educational board or curriculum ID")
    grade_level: Optional[str] = Field(None, max_length=50, description="Specific academic grade/class or year")
    academic_domain: Optional[str] = Field(None, max_length=100, description="Discipline domain (e.g., Natural Sciences, Engineering, Commerce)")
    state_region: Optional[str] = Field(None, max_length=100, description="State/Province for state board curricula")
    degree: Optional[str] = Field(None, max_length=100, description="Degree name for higher ed (e.g. B.Tech, B.Sc, M.S.)")
    department: Optional[str] = Field(None, max_length=100, description="Academic department (e.g. Information Technology, Physics)")
    specialization: Optional[str] = Field(None, max_length=100, description="Field of specialization or stream")
    academic_year: Optional[str] = Field(None, max_length=50, description="Year or semester (e.g. Year 2, Semester 4)")
    profile_completed: bool = Field(False, description="Whether the academic profile onboarding has been completed")
    preferred_language: str = Field("en", max_length=50, description="Primary explanation language")
    institution: Optional[str] = Field(None, max_length=255, description="College, school, or organization")
    interests: List[str] = Field(default_factory=list, description="List of personal learning passions and hobbies")
    custom_interests: List[str] = Field(default_factory=list, description="Custom student-defined write-in interests")
    favorite_subjects: List[str] = Field(default_factory=list, description="Favorite subject domain slugs (e.g., physics, computer-science)")
    learning_preferences: List[str] = Field(default_factory=lambda: ["visual", "practical", "step_by_step"], description="Enabled learning modes (visual, practical, step_by_step)")
    preferred_learning_style: str = Field("visual", max_length=50, description="Primary preferred mode of learning (visual, practical, step_by_step)")
    enable_code_mixing: bool = Field(True, description="Enable natural bilingual/conversational explanations")


class ProfileCreate(ProfileBase):
    email: str = Field(..., max_length=255)


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = Field(None, max_length=255)
    avatar_url: Optional[str] = Field(None, max_length=1024)
    education_level: Optional[str] = Field(None, max_length=100)
    education_category: Optional[str] = Field(None, max_length=50)
    board_type: Optional[str] = Field(None, max_length=50)
    stream: Optional[str] = Field(None, max_length=100)
    program: Optional[str] = Field(None, max_length=100)
    curriculum_id: Optional[str] = Field(None)
    grade_level: Optional[str] = Field(None, max_length=50)
    academic_domain: Optional[str] = Field(None, max_length=100)
    state_region: Optional[str] = Field(None, max_length=100)
    degree: Optional[str] = Field(None, max_length=100)
    department: Optional[str] = Field(None, max_length=100)
    specialization: Optional[str] = Field(None, max_length=100)
    academic_year: Optional[str] = Field(None, max_length=50)
    profile_completed: Optional[bool] = None
    preferred_language: Optional[str] = Field(None, max_length=50)
    institution: Optional[str] = Field(None, max_length=255)
    interests: Optional[List[str]] = None
    custom_interests: Optional[List[str]] = None
    favorite_subjects: Optional[List[str]] = None
    learning_preferences: Optional[List[str]] = None
    preferred_learning_style: Optional[str] = None
    enable_code_mixing: Optional[bool] = None


class ProfileRead(ProfileBase):
    id: str
    email: str
    is_active: bool
    completeness_score: Optional[int] = 0
    missing_fields: Optional[List[str]] = None
    profile_completeness: Optional[ProfileCompletionResult] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class StudentPreferencesRead(BaseModel):
    interests: List[str] = Field(default_factory=list)
    custom_interests: List[str] = Field(default_factory=list)
    favorite_subjects: List[str] = Field(default_factory=list)
    learning_preferences: List[str] = Field(default_factory=lambda: ["visual", "practical", "step_by_step"])
    preferred_learning_style: str = "visual"
    preferred_language: str = "en"
    enable_code_mixing: bool = True


class StudentPreferencesUpdate(BaseModel):
    interests: Optional[List[str]] = None
    custom_interests: Optional[List[str]] = None
    favorite_subjects: Optional[List[str]] = None
    learning_preferences: Optional[List[str]] = None
    preferred_learning_style: Optional[str] = None
    preferred_language: Optional[str] = None
    enable_code_mixing: Optional[bool] = None
