from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class ProfileBase(BaseModel):
    full_name: Optional[str] = Field(None, max_length=255, description="Student's display name")
    avatar_url: Optional[str] = Field(None, max_length=1024, description="Profile picture URL")
    education_level: str = Field("undergrad", max_length=100, description="Academic level (high-school, undergrad, postgrad, self-learner)")
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
