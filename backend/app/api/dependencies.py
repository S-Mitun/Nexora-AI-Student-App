from typing import Generator, Optional
from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.db.session import get_db
from backend.app.core.security import AuthenticatedUser, SecurityContext
from backend.app.services.ai.base import AIProvider
from backend.app.services.ai.factory import get_ai_provider


def get_current_user(
    authorization: Optional[str] = Header(None, description="Bearer JWT token"),
) -> AuthenticatedUser:
    """
    Validates authenticated user from request header.
    In Stage 01: supports dev-student token or anonymous student session.
    In Stage 03: fully verifies Supabase JWT claims.
    """
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        user = SecurityContext.verify_jwt_token(token)
        if user:
            return user

    # Default developmental student profile for unauthenticated local browsing
    return AuthenticatedUser(
        id="00000000-0000-0000-0000-000000000001",
        email="student@nexora.dev",
        role="student",
        is_authenticated=False,
    )


def get_ai() -> AIProvider:
    """Dependency injecting the configured AI provider."""
    return get_ai_provider()
