from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class ProfileBase(BaseModel):
    full_name: Optional[str] = Field(None, max_length=255, description="Student's display name")
    avatar_url: Optional[str] = Field(None, max_length=1024, description="Profile picture URL")
    education_level: str = Field("undergrad", max_length=100, description="Academic level (high-school, undergrad, postgrad, self-learner)")
    preferred_language: str = Field("en", max_length=50, description="Primary explanation language")
    institution: Optional[str] = Field(None, max_length=255, description="College, school, or organization")
    interests: List[str] = Field(default_factory=list, description="List of personal learning passions")
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
    enable_code_mixing: Optional[bool] = None


class ProfileRead(ProfileBase):
    id: str
    email: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
