import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.dependencies import get_optional_user
from app.core.security import AuthenticatedUser
from app.models.profile import UserProfile
from app.schemas.learning import (
    SubjectRead,
    ConceptRead,
    LearningModuleRead,
    ConceptExploreRequest,
    ConceptExploreResponse,
)
from app.services.learning.concept_service import ConceptService
from app.services.learning.personalization_service import (
    PersonalizationService,
    RecommendedTopic,
    PersonalizedContext,
)
from app.core.logging import logger

router = APIRouter(prefix="/learning", tags=["Learning Engine"])


@router.get("/subjects", response_model=List[dict])
def list_subjects(db: Session = Depends(get_db)):
    """Returns curated subject domains for student exploration."""
    return [
        {
            "id": "sub-physics",
            "name": "Physics",
            "slug": "physics",
            "description": "Wave mechanics, kinematics, electromagnetism, and orbital dynamics.",
            "icon": "Zap",
            "concept_count": 12,
        },
        {
            "id": "sub-cs",
            "name": "Computer Science",
            "slug": "computer-science",
            "description": "Algorithms, data structures, neural networks, and systems architecture.",
            "icon": "Cpu",
            "concept_count": 18,
        },
        {
            "id": "sub-math",
            "name": "Mathematics",
            "slug": "mathematics",
            "description": "Linear algebra, calculus, discrete structures, and statistics.",
            "icon": "Binary",
            "concept_count": 15,
        },
        {
            "id": "sub-bio",
            "name": "Biology",
            "slug": "biology",
            "description": "Cellular respiration, genetics, photosynthesis, and neural signaling.",
            "icon": "Dna",
            "concept_count": 10,
        },
    ]


@router.post("/explore", response_model=ConceptExploreResponse)
async def explore_concept(
    payload: ConceptExploreRequest,
    current_user: Optional[AuthenticatedUser] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """
    Decomposes a student's question or concept into NEXORA's experiential blueprint:
    DISCOVER -> WHY? -> UNDERSTAND -> VISUALIZE -> EXPERIMENT -> APPLY.
    Contextually personalizes motivation and real-world applications using the student's
    active profile interests or explicit interest hints while keeping academic math invariant.
    """
    try:
        student_interests = []
        if current_user:
            profile = db.query(UserProfile).filter(UserProfile.id == current_user.id).first()
            if profile and profile.interests:
                try:
                    student_interests = json.loads(profile.interests)
                except Exception:
                    student_interests = [i.strip() for i in profile.interests.split(",") if i.strip()]

        result = await ConceptService.explore_concept(
            query=payload.query,
            subject_hint=payload.subject_hint,
            student_interests=student_interests,
            interest_hint=payload.interest_hint,
        )
        return result
    except Exception as e:
        logger.error(f"Error decomposing concept '{payload.query}': {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to decompose concept into experiential blueprint.",
        )


@router.get("/recommendations", response_model=List[RecommendedTopic])
def get_recommendations(
    current_user: Optional[AuthenticatedUser] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """
    Returns curated, interest-relatable topic recommendations for the student dashboard.
    Falls back gracefully to curriculum standard foundations if no interests are selected.
    """
    student_interests = []
    favorite_subjects = []

    if current_user:
        profile = db.query(UserProfile).filter(UserProfile.id == current_user.id).first()
        if profile:
            if profile.interests:
                try:
                    student_interests = json.loads(profile.interests)
                except Exception:
                    student_interests = [i.strip() for i in profile.interests.split(",") if i.strip()]
            if getattr(profile, "favorite_subjects", None):
                try:
                    favorite_subjects = json.loads(profile.favorite_subjects)
                except Exception:
                    favorite_subjects = [s.strip() for s in profile.favorite_subjects.split(",") if s.strip()]

    return PersonalizationService.get_recommended_topics(
        student_interests=student_interests,
        favorite_subjects=favorite_subjects,
    )


@router.get("/perspectives/{concept_slug}", response_model=List[PersonalizedContext])
def get_perspectives(concept_slug: str):
    """
    Retrieves all available interest-relatable perspectives for a specific concept,
    allowing students to toggle between Gaming, Cricket, Cars, Music, and Space perspectives.
    """
    clean_slug = concept_slug.replace("-", " ")
    return PersonalizationService.get_all_perspectives_for_concept(clean_slug)
