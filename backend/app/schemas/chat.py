from typing import List, Optional, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class ChatMessageCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=4000)


class ChatMessageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    session_id: str
    role: str
    content: str
    citations: List[Any] = Field(default_factory=list)
    created_at: datetime


class ChatSessionCreate(BaseModel):
    title: Optional[str] = "New Discussion"
    concept_id: Optional[str] = None


class ChatSessionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    user_id: str
    title: str
    concept_id: Optional[str] = None
    created_at: datetime
    messages: List[ChatMessageRead] = Field(default_factory=list)
