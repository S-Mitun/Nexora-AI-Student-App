from typing import Optional, Any
from pydantic import BaseModel, Field


class ErrorResponse(BaseModel):
    """Structured, safe error response preventing leakage of stack traces."""
    success: bool = Field(False)
    error_code: str = Field(..., description="Unique machine-readable error code")
    message: str = Field(..., description="Human-readable safe error message")
    details: Optional[Any] = Field(None, description="Optional safe context")


class PaginationParams(BaseModel):
    """Standard query parameters for paginated resources."""
    skip: int = Field(0, ge=0)
    limit: int = Field(20, ge=1, le=100)
