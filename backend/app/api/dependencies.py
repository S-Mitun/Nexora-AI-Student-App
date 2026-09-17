from typing import Generator, Optional
from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.security import AuthenticatedUser, SecurityContext
from app.services.ai.base import AIProvider
from app.services.ai.factory import get_ai_provider


def get_current_user(
    authorization: Optional[str] = Header(None, description="Bearer JWT token"),
) -> AuthenticatedUser:
    """
    Validates authenticated user from request header.
    Rejects missing, malformed, invalid, or expired tokens with HTTP 401 Unauthorized.
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Missing Authorization header.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    parts = authorization.split(" ")
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization format. Expected 'Bearer <token>'.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = parts[1]
    user = SecurityContext.verify_jwt_token(token)
    if not user or not user.is_authenticated:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid, revoked, or expired authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


def get_optional_user(
    authorization: Optional[str] = Header(None, description="Bearer JWT token"),
) -> Optional[AuthenticatedUser]:
    """
    Optional user dependency for public endpoints that adapt behavior when authenticated.
    Returns None if no token or invalid token.
    """
    if not authorization or not authorization.startswith("Bearer "):
        return None

    token = authorization.split(" ")[1]
    return SecurityContext.verify_jwt_token(token)


def get_ai() -> AIProvider:
    """Dependency injecting the configured AI provider."""
    return get_ai_provider()
