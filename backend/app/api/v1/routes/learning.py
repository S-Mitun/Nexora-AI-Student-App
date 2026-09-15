from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.db.session import get_db
from backend.app.schemas.learning import (
    SubjectRead,
    ConceptRead,
    LearningModuleRead,
    ConceptExploreRequest,
    ConceptExploreResponse,
)
from backend.app.services.learning.concept_service import ConceptService
from backend.app.core.logging import logger

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
async def explore_concept(payload: ConceptExploreRequest):
    """
    Decomposes a student's question or concept into NEXORA's experiential blueprint:
    DISCOVER -> WHY? -> UNDERSTAND -> VISUALIZE -> EXPERIMENT -> APPLY
    """
    try:
        result = await ConceptService.explore_concept(
            query=payload.query,
            subject_hint=payload.subject_hint,
        )
        return result
    except Exception as e:
        logger.error(f"Error decomposing concept '{payload.query}': {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to decompose concept into experiential blueprint.",
        )
