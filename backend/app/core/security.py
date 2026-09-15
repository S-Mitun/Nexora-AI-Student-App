from typing import Optional
from pydantic import BaseModel, Field


class AuthenticatedUser(BaseModel):
    """Normalized authenticated user context across Supabase and custom auth providers."""
    id: str = Field(..., description="Unique user identifier (UUID)")
    email: Optional[str] = Field(None, description="User email address")
    role: str = Field("student", description="User authorization role (student, educator, admin)")
    is_authenticated: bool = Field(True, description="Authentication flag")


class SecurityContext:
    """Security provider interface prepared for Supabase Auth in Stage 03."""

    @staticmethod
    def verify_jwt_token(token: str) -> Optional[AuthenticatedUser]:
        """
        Validates a JWT token.
        In Stage 01 foundation: provides a clean validation boundary.
        In Stage 03: verifies Supabase RS256/HS256 tokens using the Supabase public key or secret.
        """
        if not token:
            return None
        
        # Foundation mock validation for dev testing
        if token.startswith("dev-student-"):
            user_id = token.replace("dev-student-", "")
            return AuthenticatedUser(id=user_id or "00000000-0000-0000-0000-000000000001", email="student@nexora.dev", role="student")
        
        return None
