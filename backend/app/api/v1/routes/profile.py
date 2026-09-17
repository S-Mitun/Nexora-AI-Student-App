import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.dependencies import get_current_user
from app.core.security import AuthenticatedUser
from app.models.profile import UserProfile
from app.schemas.profile import ProfileRead, ProfileUpdate

router = APIRouter(prefix="/profile", tags=["Student Profile Management"])


def _model_to_dict(profile: UserProfile) -> dict:
    """Helper to convert UserProfile model to dict with parsed JSON interests."""
    parsed_interests = []
    if profile.interests:
        try:
            parsed_interests = json.loads(profile.interests)
        except Exception:
            parsed_interests = [i.strip() for i in profile.interests.split(",") if i.strip()]

    return {
        "id": profile.id,
        "email": profile.email,
        "full_name": profile.full_name,
        "avatar_url": profile.avatar_url,
        "education_level": profile.education_level or "undergrad",
        "preferred_language": profile.preferred_language or "en",
        "institution": profile.institution,
        "interests": parsed_interests,
        "enable_code_mixing": profile.enable_code_mixing if profile.enable_code_mixing is not None else True,
        "is_active": profile.is_active,
        "created_at": profile.created_at,
        "updated_at": profile.updated_at,
    }


@router.get("", response_model=ProfileRead)
def get_student_profile(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProfileRead:
    """
    Retrieves the authenticated student's profile.
    Automatically provisions a base profile record if one does not exist yet.
    """
    profile = db.query(UserProfile).filter(UserProfile.id == current_user.id).first()

    if not profile:
        # Auto-provision profile from authenticated user context
        profile = UserProfile(
            id=current_user.id,
            email=current_user.email or f"student_{current_user.id[:8]}@nexora.dev",
            full_name=current_user.email.split("@")[0].title() if current_user.email else "Nexora Student",
            education_level="undergrad",
            preferred_language="en",
            interests=json.dumps([]),
            enable_code_mixing=True,
            is_active=True,
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)

    return ProfileRead(**_model_to_dict(profile))


@router.put("", response_model=ProfileRead)
def update_student_profile(
    updates: ProfileUpdate,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProfileRead:
    """
    Updates the authenticated student's profile settings.
    Authorization is derived strictly from the verified token (current_user.id).
    """
    profile = db.query(UserProfile).filter(UserProfile.id == current_user.id).first()

    if not profile:
        # Create if missing
        profile = UserProfile(
            id=current_user.id,
            email=current_user.email or f"student_{current_user.id[:8]}@nexora.dev",
            full_name=updates.full_name or "Nexora Student",
            education_level=updates.education_level or "undergrad",
            preferred_language=updates.preferred_language or "en",
            institution=updates.institution,
            interests=json.dumps(updates.interests or []),
            enable_code_mixing=updates.enable_code_mixing if updates.enable_code_mixing is not None else True,
            is_active=True,
        )
        db.add(profile)
    else:
        if updates.full_name is not None:
            profile.full_name = updates.full_name
        if updates.avatar_url is not None:
            profile.avatar_url = updates.avatar_url
        if updates.education_level is not None:
            profile.education_level = updates.education_level
        if updates.preferred_language is not None:
            profile.preferred_language = updates.preferred_language
        if updates.institution is not None:
            profile.institution = updates.institution
        if updates.interests is not None:
            profile.interests = json.dumps(updates.interests)
        if updates.enable_code_mixing is not None:
            profile.enable_code_mixing = updates.enable_code_mixing

    db.commit()
    db.refresh(profile)
    return ProfileRead(**_model_to_dict(profile))
