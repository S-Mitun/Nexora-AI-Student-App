import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.dependencies import get_current_user
from app.core.security import AuthenticatedUser
from app.models.profile import UserProfile
from app.schemas.profile import (
    ProfileRead,
    ProfileUpdate,
    StudentPreferencesRead,
    StudentPreferencesUpdate,
)
from app.services.learning.personalization_service import PersonalizationService

router = APIRouter(prefix="/profile", tags=["Student Profile Management"])


def _parse_json_list(val: str) -> list:
    """Helper to safely parse JSON strings or fallback to comma-separated values."""
    if not val:
        return []
    try:
        parsed = json.loads(val)
        if isinstance(parsed, list):
            return parsed
        return []
    except Exception:
        return [i.strip() for i in val.split(",") if i.strip()]


def _parse_learning_preferences(profile: UserProfile) -> list:
    """Helper to safely retrieve enabled learning preferences with default-all fallback."""
    raw = getattr(profile, "learning_preferences", None)
    parsed = _parse_json_list(raw)
    if parsed and len(parsed) >= 1:
        # Filter to only currently recognized preferences or aliases
        is_valid, clean_list, _ = PersonalizationService.validate_learning_preferences(parsed)
        if is_valid and len(clean_list) >= 1:
            return clean_list
    # Existing user backward-compatibility: if preferred_learning_style is explicitly set
    old_style = getattr(profile, "preferred_learning_style", None)
    if old_style and old_style in PersonalizationService.AVAILABLE_LEARNING_PREFERENCES:
        return [old_style]
    # Default state for accounts without preferences: ALL available preferences enabled
    return list(PersonalizationService.DEFAULT_LEARNING_PREFERENCES)


def _model_to_dict(profile: UserProfile) -> dict:
    """Helper to convert UserProfile model to dict with parsed JSON interests and preferences."""
    parsed_interests = _parse_json_list(profile.interests)
    parsed_custom = _parse_json_list(getattr(profile, "custom_interests", "[]"))
    parsed_favorite_subjects = _parse_json_list(getattr(profile, "favorite_subjects", "[]"))
    parsed_learning_prefs = _parse_learning_preferences(profile)

    # Compute completeness
    missing = []
    checks = 0
    total = 5
    if profile.full_name and profile.full_name.strip():
        checks += 1
    else:
        missing.append("full_name")
    if getattr(profile, "education_level", None) and getattr(profile, "education_category", None):
        checks += 1
    else:
        missing.append("education_level")
    if getattr(profile, "grade_level", None):
        checks += 1
    else:
        missing.append("grade_level")
    if getattr(profile, "curriculum_id", None):
        checks += 1
    else:
        missing.append("curriculum_id")
    if getattr(profile, "academic_domain", None):
        checks += 1
    else:
        missing.append("academic_domain")
    completeness_score = int((checks / total) * 100)

    return {
        "id": profile.id,
        "email": profile.email,
        "full_name": profile.full_name,
        "avatar_url": profile.avatar_url,
        "education_level": profile.education_level or "undergraduate",
        "education_category": getattr(profile, "education_category", "undergraduate") or "undergraduate",
        "curriculum_id": getattr(profile, "curriculum_id", None),
        "grade_level": getattr(profile, "grade_level", "Class 10") or "Class 10",
        "academic_domain": getattr(profile, "academic_domain", "General Studies") or "General Studies",
        "state_region": getattr(profile, "state_region", None),
        "degree": getattr(profile, "degree", None),
        "department": getattr(profile, "department", None),
        "specialization": getattr(profile, "specialization", None),
        "academic_year": getattr(profile, "academic_year", None),
        "profile_completed": getattr(profile, "profile_completed", False) or (completeness_score == 100),
        "completeness_score": completeness_score,
        "missing_fields": missing,
        "preferred_language": profile.preferred_language or "en",
        "institution": profile.institution,
        "interests": parsed_interests,
        "custom_interests": parsed_custom,
        "favorite_subjects": parsed_favorite_subjects,
        "learning_preferences": parsed_learning_prefs,
        "preferred_learning_style": getattr(profile, "preferred_learning_style", "visual") or "visual",
        "enable_code_mixing": profile.enable_code_mixing if profile.enable_code_mixing is not None else True,
        "is_active": profile.is_active,
        "created_at": profile.created_at,
        "updated_at": profile.updated_at,
    }


def _ensure_profile(db: Session, current_user: AuthenticatedUser) -> UserProfile:
    """Retrieves or automatically provisions a student profile."""
    profile = db.query(UserProfile).filter(UserProfile.id == current_user.id).first()
    if not profile:
        clean_uid = current_user.id.replace("-", "_")
        profile = UserProfile(
            id=current_user.id,
            email=current_user.email or f"student_{clean_uid}@nexora.dev",
            full_name=current_user.email.split("@")[0].title() if current_user.email else "Nexora Student",
            education_level="undergraduate",
            curriculum_id=None,
            grade_level="Class 10",
            academic_domain="General Studies",
            preferred_language="en",
            interests=json.dumps([]),
            custom_interests=json.dumps([]),
            favorite_subjects=json.dumps([]),
            learning_preferences=json.dumps(PersonalizationService.DEFAULT_LEARNING_PREFERENCES),
            preferred_learning_style="visual",
            enable_code_mixing=True,
            is_active=True,
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


@router.get("", response_model=ProfileRead)
def get_student_profile(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProfileRead:
    """
    Retrieves the authenticated student's profile.
    Automatically provisions a base profile record if one does not exist yet.
    """
    profile = _ensure_profile(db, current_user)
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
    profile = _ensure_profile(db, current_user)

    if updates.full_name is not None:
        profile.full_name = updates.full_name
    if updates.avatar_url is not None:
        profile.avatar_url = updates.avatar_url
    if updates.education_level is not None:
        profile.education_level = updates.education_level
    if updates.education_category is not None:
        profile.education_category = updates.education_category
    if updates.curriculum_id is not None:
        profile.curriculum_id = updates.curriculum_id
    if updates.grade_level is not None:
        profile.grade_level = updates.grade_level
    if updates.academic_domain is not None:
        profile.academic_domain = updates.academic_domain
    if updates.state_region is not None:
        profile.state_region = updates.state_region
    if updates.degree is not None:
        profile.degree = updates.degree
    if updates.department is not None:
        profile.department = updates.department
    if updates.specialization is not None:
        profile.specialization = updates.specialization
    if updates.academic_year is not None:
        profile.academic_year = updates.academic_year
    if updates.profile_completed is not None:
        profile.profile_completed = updates.profile_completed
    if updates.preferred_language is not None:
        lang = updates.preferred_language.strip().lower()
        if lang in {"en", "ta", "te", "hi"}:
            profile.preferred_language = lang
    if updates.institution is not None:
        profile.institution = updates.institution
    if updates.interests is not None:
        clean_canon, clean_cust = PersonalizationService.validate_and_clean_interests(
            updates.interests,
            updates.custom_interests if updates.custom_interests is not None else _parse_json_list(profile.custom_interests),
        )
        profile.interests = json.dumps(clean_canon)
        profile.custom_interests = json.dumps(clean_cust)
    elif updates.custom_interests is not None:
        clean_canon, clean_cust = PersonalizationService.validate_and_clean_interests(
            _parse_json_list(profile.interests),
            updates.custom_interests,
        )
        profile.interests = json.dumps(clean_canon)
        profile.custom_interests = json.dumps(clean_cust)

    if updates.favorite_subjects is not None:
        profile.favorite_subjects = json.dumps([s.strip().lower() for s in updates.favorite_subjects if s.strip()])
    
    if updates.learning_preferences is not None:
        is_valid, clean_prefs, err_msg = PersonalizationService.validate_learning_preferences(
            updates.learning_preferences,
            fallback_existing=_parse_learning_preferences(profile),
        )
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=err_msg or "At least one learning preference must remain enabled.",
            )
        profile.learning_preferences = json.dumps(clean_prefs)
        profile.preferred_learning_style = clean_prefs[0]

    if updates.preferred_learning_style is not None and updates.learning_preferences is None:
        profile.preferred_learning_style = updates.preferred_learning_style

    if updates.enable_code_mixing is not None:
        profile.enable_code_mixing = updates.enable_code_mixing

    db.commit()
    db.refresh(profile)
    return ProfileRead(**_model_to_dict(profile))


@router.get("/preferences", response_model=StudentPreferencesRead)
def get_student_preferences(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> StudentPreferencesRead:
    """
    Retrieves the authenticated student's learning preferences and interests.
    """
    profile = _ensure_profile(db, current_user)
    return StudentPreferencesRead(
        interests=_parse_json_list(profile.interests),
        custom_interests=_parse_json_list(getattr(profile, "custom_interests", "[]")),
        favorite_subjects=_parse_json_list(getattr(profile, "favorite_subjects", "[]")),
        learning_preferences=_parse_learning_preferences(profile),
        preferred_learning_style=getattr(profile, "preferred_learning_style", "visual") or "visual",
        preferred_language=profile.preferred_language or "en",
        enable_code_mixing=profile.enable_code_mixing if profile.enable_code_mixing is not None else True,
    )


@router.patch("/preferences", response_model=StudentPreferencesRead)
def update_student_preferences(
    prefs: StudentPreferencesUpdate,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> StudentPreferencesRead:
    """
    Updates the authenticated student's interests, learning preferences, and language.
    Normalizes casing, deduplicates categories, and safely validates the Minimum One Preference Rule.
    """
    profile = _ensure_profile(db, current_user)

    current_interests = _parse_json_list(profile.interests)
    current_custom = _parse_json_list(getattr(profile, "custom_interests", "[]"))

    target_interests = prefs.interests if prefs.interests is not None else current_interests
    target_custom = prefs.custom_interests if prefs.custom_interests is not None else current_custom

    clean_canon, clean_cust = PersonalizationService.validate_and_clean_interests(
        target_interests,
        target_custom,
    )

    profile.interests = json.dumps(clean_canon)
    profile.custom_interests = json.dumps(clean_cust)

    if prefs.favorite_subjects is not None:
        profile.favorite_subjects = json.dumps([s.strip().lower() for s in prefs.favorite_subjects if s.strip()])

    if prefs.learning_preferences is not None:
        is_valid, clean_prefs, err_msg = PersonalizationService.validate_learning_preferences(
            prefs.learning_preferences,
            fallback_existing=_parse_learning_preferences(profile),
        )
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=err_msg or "At least one learning preference must remain enabled.",
            )
        profile.learning_preferences = json.dumps(clean_prefs)
        profile.preferred_learning_style = clean_prefs[0]

    if prefs.preferred_learning_style is not None and prefs.learning_preferences is None:
        style = prefs.preferred_learning_style.strip().lower()
        if style in ["visual", "practical", "step_by_step", "theoretical"]:
            profile.preferred_learning_style = style
        else:
            profile.preferred_learning_style = "visual"

    if prefs.preferred_language is not None:
        lang = prefs.preferred_language.strip().lower()
        if lang in {"en", "ta", "te", "hi"}:
            profile.preferred_language = lang

    if prefs.enable_code_mixing is not None:
        profile.enable_code_mixing = prefs.enable_code_mixing

    db.commit()
    db.refresh(profile)

    return StudentPreferencesRead(
        interests=clean_canon,
        custom_interests=clean_cust,
        favorite_subjects=_parse_json_list(profile.favorite_subjects),
        learning_preferences=_parse_learning_preferences(profile),
        preferred_learning_style=profile.preferred_learning_style or "visual",
        preferred_language=profile.preferred_language or "en",
        enable_code_mixing=profile.enable_code_mixing,
    )


@router.post("/preferences/reset", response_model=StudentPreferencesRead)
def reset_student_preferences(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> StudentPreferencesRead:
    """
    Resets the authenticated student's personalization preferences to default state.
    Restores ALL available learning preferences as enabled by default.
    Preserves the student's selected language.
    """
    profile = _ensure_profile(db, current_user)
    profile.interests = json.dumps([])
    profile.custom_interests = json.dumps([])
    profile.favorite_subjects = json.dumps([])
    profile.learning_preferences = json.dumps(PersonalizationService.DEFAULT_LEARNING_PREFERENCES)
    profile.preferred_learning_style = "visual"
    db.commit()
    db.refresh(profile)

    return StudentPreferencesRead(
        interests=[],
        custom_interests=[],
        favorite_subjects=[],
        learning_preferences=list(PersonalizationService.DEFAULT_LEARNING_PREFERENCES),
        preferred_learning_style="visual",
        preferred_language=profile.preferred_language or "en",
        enable_code_mixing=profile.enable_code_mixing,
    )
