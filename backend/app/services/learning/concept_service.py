from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.learning import Subject, Topic, Concept, LearningModule
from app.schemas.learning import ConceptExploreResponse
from app.services.ai.factory import get_ai_provider
from app.core.logging import logger


class ConceptService:
    """Core domain service managing concepts and experiential learning modules."""

    @staticmethod
    def get_all_subjects(db: Session) -> List[Subject]:
        return db.query(Subject).order_index if hasattr(Subject, 'order_index') else db.query(Subject).all()

    @staticmethod
    def get_concept_by_slug(db: Session, slug: str) -> Optional[Concept]:
        return db.query(Concept).filter(Concept.slug == slug).first()

    @staticmethod
    async def explore_concept(
        query: str,
        subject_hint: Optional[str] = None,
        student_interests: Optional[List[str]] = None,
        interest_hint: Optional[str] = None,
    ) -> ConceptExploreResponse:
        """
        Decomposes a student query into an experiential learning blueprint:
        Intuition, Why it matters, Interactive Simulation spec, Knowledge checks,
        and interest-tailored contextual personalization.
        """
        from app.services.learning.personalization_service import PersonalizationService

        logger.info(f"ConceptService exploring concept: '{query}' (hint: {subject_hint}, interest_hint: {interest_hint})")
        ai_provider = get_ai_provider()
        
        prompt = (
            f"Concept to decompose: {query}\n"
            f"Subject hint: {subject_hint or 'general'}\n"
            f"Transform this concept into NEXORA's experiential format: why it matters, simple explanation, "
            f"technical explanation, interactive simulation parameters, and quick check question."
        )
        
        result: ConceptExploreResponse = await ai_provider.generate_structured(
            prompt=prompt,
            response_model=ConceptExploreResponse,
            system_instruction="You are NEXORA, an experience-first learning companion.",
        )

        # Attach deterministic contextual personalization without modifying academic core
        active_ctx = PersonalizationService.get_personalization_for_concept(
            concept_name=result.concept,
            student_interests=student_interests,
            preferred_interest=interest_hint,
        )
        all_perspectives = PersonalizationService.get_all_perspectives_for_concept(result.concept)

        result.personalized_context = active_ctx.model_dump()
        result.available_perspectives = [p.model_dump() for p in all_perspectives]

        return result

