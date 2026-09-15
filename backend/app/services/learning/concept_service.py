from typing import List, Optional
from sqlalchemy.orm import Session
from backend.app.models.learning import Subject, Topic, Concept, LearningModule
from backend.app.schemas.learning import ConceptExploreResponse
from backend.app.services.ai.factory import get_ai_provider
from backend.app.core.logging import logger


class ConceptService:
    """Core domain service managing concepts and experiential learning modules."""

    @staticmethod
    def get_all_subjects(db: Session) -> List[Subject]:
        return db.query(Subject).order_index if hasattr(Subject, 'order_index') else db.query(Subject).all()

    @staticmethod
    def get_concept_by_slug(db: Session, slug: str) -> Optional[Concept]:
        return db.query(Concept).filter(Concept.slug == slug).first()

    @staticmethod
    async def explore_concept(query: str, subject_hint: Optional[str] = None) -> ConceptExploreResponse:
        """
        Decomposes a student query into an experiential learning blueprint:
        Intuition, Why it matters, Interactive Simulation spec, and Knowledge checks.
        """
        logger.info(f"ConceptService exploring concept: '{query}' (hint: {subject_hint})")
        ai_provider = get_ai_provider()
        
        prompt = (
            f"Concept to decompose: {query}\n"
            f"Subject hint: {subject_hint or 'general'}\n"
            f"Transform this concept into NEXORA's experiential format: why it matters, simple explanation, "
            f"technical explanation, interactive simulation parameters, and quick check question."
        )
        
        result = await ai_provider.generate_structured(
            prompt=prompt,
            response_model=ConceptExploreResponse,
            system_instruction="You are NEXORA, an AI-powered experience-first learning companion.",
        )
        return result
