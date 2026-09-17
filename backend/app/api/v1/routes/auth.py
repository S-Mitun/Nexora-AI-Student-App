from fastapi import APIRouter, Depends
from app.api.dependencies import get_current_user
from app.core.security import AuthenticatedUser
from app.schemas.auth import UserContextResponse

router = APIRouter(prefix="/auth", tags=["Authentication & User Context"])


@router.get("/me", response_model=UserContextResponse)
def get_current_user_context(current_user: AuthenticatedUser = Depends(get_current_user)) -> UserContextResponse:
    """
    Protected endpoint verifying student token validity.
    Returns safe user context including provider identities without exposing secrets, tokens, or sensitive internals.
    """
    return UserContextResponse(
        id=current_user.id,
        email=current_user.email,
        role=current_user.role,
        is_authenticated=True,
        provider=current_user.provider,
        identities=current_user.identities or [],
    )
