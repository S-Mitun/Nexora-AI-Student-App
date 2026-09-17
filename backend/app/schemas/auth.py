from typing import Optional, List
from pydantic import BaseModel, Field


class UserContextResponse(BaseModel):
    """Safe authenticated user context response returned by /api/v1/auth/me."""
    id: str = Field(..., description="Unique user identifier (UUID)")
    email: Optional[str] = Field(None, description="User email address")
    role: str = Field("student", description="Authorization role")
    is_authenticated: bool = Field(True, description="Authentication confirmation")
    provider: Optional[str] = Field(None, description="Primary authentication provider (email, google, etc.)")
    identities: Optional[List[str]] = Field(default_factory=list, description="List of linked authentication identity providers")
