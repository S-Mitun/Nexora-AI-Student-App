import json
import hashlib
from typing import Optional, List
from sqlalchemy.orm import Session
from datetime import datetime

from app.models.profile import UserProfile
from app.models.learning import Curriculum, Subject, StudentSubject, Topic, Concept
from app.models.documents import Document
from app.schemas.context import AcademicContextResponse, KnowledgeScope
from app.core.logging import logger


class AcademicContextResolver:
    """
    Centralized Academic Context Resolver Service.
    Integrates verified student profile, educational level, curriculum board overlay,
    enrolled subjects, and user-uploaded academic materials into one cohesive context.
    """

    @staticmethod
    def normalize_academic_level(level_raw: Optional[str], category_raw: Optional[str]) -> str:
        """Converts diverse level strings into standard canonical level tokens."""
        raw = (level_raw or category_raw or "undergraduate").strip().lower().replace("-", "_").replace(" ", "_")
        
        if any(k in raw for k in ["primary", "class_1_5", "1_5", "k_5", "elementary"]):
            return "class_1_5"
        if any(k in raw for k in ["higher_secondary", "class_11_12", "11_12", "senior_secondary"]):
            return "class_11_12"
        if any(k in raw for k in ["secondary", "middle", "class_6_10", "6_10", "class_6_8", "class_9_10"]):
            return "class_6_10"
        if any(k in raw for k in ["undergraduate", "ug", "college", "b_tech", "btech", "b_sc", "b_com"]):
            return "undergraduate"
        if any(k in raw for k in ["postgraduate", "pg", "master", "m_tech", "m_sc"]):
            return "postgraduate"
        if any(k in raw for k in ["research", "phd", "doctoral", "scholar"]):
            return "research"
        if "custom" in raw or "independent" in raw:
            return "custom"
        return "undergraduate"

    @classmethod
    def level_matches(cls, subject_level: Optional[str], canonical_level: str) -> bool:
        """Checks if a subject's educational level matches the student's canonical level."""
        if not subject_level:
            return True
        norm = subject_level.strip().lower().replace("-", "_").replace(" ", "_")
        if norm in ["all_levels", "general"]:
            return True
        return cls.normalize_academic_level(norm, None) == canonical_level

    @classmethod
    def resolve_context(
        cls,
        db: Session,
        user_id: str,
        active_subject_slug: Optional[str] = None,
        active_concept_slug: Optional[str] = None,
    ) -> AcademicContextResponse:
        """
        Resolves the authoritative Academic Context for a given student.
        Provides a unified source of truth for all Academic Workspace views.
        """
        # 1. Fetch Student Profile
        profile = db.query(UserProfile).filter(UserProfile.id == user_id).first()
        if not profile:
            clean_id = user_id.replace("-", "_")
            profile = UserProfile(
                id=user_id,
                email=f"student_{clean_id}@nexora.dev",
                education_level=None,
                education_category=None,
                grade_level=None,
                academic_domain=None,
            )
            db.add(profile)
            db.commit()
            db.refresh(profile)

        # 2. Normalize Academic Level
        canonical_level = cls.normalize_academic_level(profile.education_level, profile.education_category)

        # 3. Fetch Curriculum / Board Overlay
        curriculum = None
        if profile.curriculum_id:
            curriculum = db.query(Curriculum).filter(Curriculum.id == profile.curriculum_id).first()

        # 4. Fetch Enrolled Subject IDs strictly matching canonical_level
        enrolled_records = (
            db.query(StudentSubject)
            .join(Subject, Subject.id == StudentSubject.subject_id)
            .filter(
                StudentSubject.user_id == user_id,
                StudentSubject.is_active == True,
            )
            .all()
        )
        enrolled_subject_ids = [
            r.subject_id for r in enrolled_records
            if cls.level_matches(getattr(r.subject, "education_level", None), canonical_level)
            and (not getattr(r, "academic_level", None) or r.academic_level == canonical_level)
        ]

        # 5. Fetch Available Material IDs (User Uploaded Materials)
        material_records = (
            db.query(Document)
            .filter(Document.user_id == user_id, Document.status.in_(["completed", "ready", "processing"]))
            .all()
        )
        available_material_ids = [d.id for d in material_records]

        # 6. Resolve Active Subject Pointer if specified
        active_subject_id = None
        active_subject_name = None
        active_topic_slug = None
        
        if active_subject_slug:
            subj = db.query(Subject).filter(
                (Subject.slug == active_subject_slug) | (Subject.id == active_subject_slug),
                Subject.is_active == True,
            ).first()
            if subj:
                active_subject_id = subj.id
                active_subject_name = subj.name
                active_subject_slug = subj.slug

        # 7. Resolve Active Concept Pointer if specified
        if active_concept_slug:
            concept = db.query(Concept).filter(
                (Concept.slug == active_concept_slug) | (Concept.id == active_concept_slug),
                Concept.is_active == True,
            ).first()
            if concept and concept.topic:
                active_topic_slug = concept.topic.slug
                if not active_subject_id and concept.topic.subject:
                    active_subject_id = concept.topic.subject.id
                    active_subject_name = concept.topic.subject.name
                    active_subject_slug = concept.topic.subject.slug

        # 8. Parse Learning Preferences safely
        preferences = ["visual", "practical", "step_by_step"]
        if profile.learning_preferences:
            try:
                if isinstance(profile.learning_preferences, list):
                    preferences = profile.learning_preferences
                elif isinstance(profile.learning_preferences, str):
                    preferences = json.loads(profile.learning_preferences)
            except Exception:
                preferences = ["visual", "practical", "step_by_step"]

        # 10. Compute deterministic canonical context partition identifier
        board_part = (curriculum.code if curriculum else (profile.board_type or "standard")).lower().replace(" ", "_").replace("-", "_")
        grade_part = (profile.grade_level or "standard").lower().replace(" ", "_").replace("-", "_")
        canonical_context_id = f"{canonical_level}:{board_part}:{grade_part}"
        
        raw_fp = f"{user_id}:{canonical_context_id}:{profile.preferred_language or 'en'}:{profile.curriculum_id or 'none'}"
        context_fingerprint = hashlib.sha256(raw_fp.encode()).hexdigest()[:16]

        # 9. Knowledge Scope
        scope = KnowledgeScope(
            baseline=True,
            board_overlay=curriculum is not None,
            user_materials=len(available_material_ids) > 0,
            external_verified=False,
        )

        response = AcademicContextResponse(
            user_id=user_id,
            context_id=canonical_context_id,
            context_fingerprint=context_fingerprint,
            academic_level=canonical_level,
            education_category=profile.education_category or canonical_level,
            curriculum_id=profile.curriculum_id,
            curriculum_code=curriculum.code if curriculum else None,
            curriculum_name=curriculum.name if curriculum else None,
            board_authority=curriculum.board_authority if curriculum else None,
            board_type=profile.board_type or (curriculum.board_type if curriculum else None),
            grade_level=profile.grade_level,
            academic_domain=profile.academic_domain,
            state_region=profile.state_region or (curriculum.state_region if curriculum else None),
            stream=profile.stream or (curriculum.stream if curriculum else None),
            program=profile.program or (curriculum.program if curriculum else None),
            degree=profile.degree,
            department=profile.department,
            specialization=profile.specialization,
            academic_year=profile.academic_year,
            institution=profile.institution,
            preferred_language=profile.preferred_language or "en",
            learning_preferences=preferences,
            active_subject_id=active_subject_id,
            active_subject_slug=active_subject_slug,
            active_subject_name=active_subject_name,
            active_topic_slug=active_topic_slug,
            active_concept_slug=active_concept_slug,
            enrolled_subject_ids=enrolled_subject_ids,
            available_material_ids=available_material_ids,
            knowledge_scope=scope,
            resolved_at=datetime.utcnow(),
        )

        logger.info(
            f"[AcademicContextResolver] Resolved context for user {user_id[:8]} "
            f"[Level: {canonical_level}, Board: {response.curriculum_code or 'None'}, "
            f"Enrolled: {len(enrolled_subject_ids)}, Materials: {len(available_material_ids)}]"
        )

        return response
