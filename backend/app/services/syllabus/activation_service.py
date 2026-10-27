import re
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Tuple, Type
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.core.logging import logger
from app.models.syllabus import (
    Syllabus,
    SyllabusVersion,
    SyllabusCurriculumDraft,
    SyllabusDraftSubject,
    SyllabusDraftModule,
    SyllabusDraftTopic,
)
from app.models.learning import (
    Subject,
    Topic,
    Concept,
    LearningModule,
    Lesson,
    StudentSubject,
)
from app.schemas.syllabus import (
    SyllabusDraftCorrectionRequest,
    SyllabusCurriculumActivationResponse,
    SyllabusActivationEligibilityResponse,
)
from app.services.learning.context_service import AcademicContextResolver


def _generate_unique_slug(db: Session, model_cls: Type, base_text: str, prefix: str = "") -> str:
    """Generates a clean, URL-safe slug guaranteed unique within the target table."""
    cleaned = re.sub(r'[^a-zA-Z0-9\s-]', '', base_text).strip().lower()
    slug_base = re.sub(r'[\s-]+', '-', cleaned)[:60] or "item"
    short_hash = uuid.uuid4().hex[:6]
    candidate = f"{prefix}-{slug_base}-{short_hash}" if prefix else f"{slug_base}-{short_hash}"

    # Check for collision if model has a slug field
    if hasattr(model_cls, "slug"):
        exists = db.query(model_cls).filter(model_cls.slug == candidate).first() is not None
        while exists:
            candidate = f"{candidate[:65]}-{uuid.uuid4().hex[:4]}"
            exists = db.query(model_cls).filter(model_cls.slug == candidate).first() is not None
    return candidate


class SyllabusCurriculumActivationService:
    """
    Master Prompt 05R: Curriculum Review, Correction, Approval and Explicit Activation Service.

    Guarantees:
    1. Authorized review and correction of persistent syllabus-derived curriculum drafts.
    2. Independent backend validation of activation eligibility.
    3. Atomic database transaction translating draft entities into runtime subjects/topics/lessons.
    4. Clean supersession of previous active versions without deleting historical drafts or data.
    5. Zero phantom, default, or unanchored academic content generation.
    """

    @classmethod
    def validate_activation_eligibility(
        cls,
        db: Session,
        user_id: str,
        syllabus_id: str,
        version_id: str,
    ) -> SyllabusActivationEligibilityResponse:
        """
        Validates whether a syllabus curriculum draft is eligible for explicit activation.
        Checks user ownership, draft existence, reviewable status, and active item counts.
        """
        syllabus = (
            db.query(Syllabus)
            .filter(Syllabus.id == syllabus_id, Syllabus.user_id == user_id)
            .first()
        )
        if not syllabus:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Syllabus not found or access denied.",
            )

        version = (
            db.query(SyllabusVersion)
            .filter(
                SyllabusVersion.id == version_id,
                SyllabusVersion.syllabus_id == syllabus_id,
            )
            .first()
        )
        if not version:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Syllabus version not found.",
            )

        draft = (
            db.query(SyllabusCurriculumDraft)
            .filter(
                SyllabusCurriculumDraft.syllabus_version_id == version_id,
                SyllabusCurriculumDraft.user_id == user_id,
            )
            .first()
        )
        if not draft:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No persistent curriculum draft found for this syllabus version. Compile draft first.",
            )

        has_active_subjects = (
            db.query(Subject)
            .filter(
                Subject.syllabus_version_id == version.id,
                Subject.user_id == user_id,
                Subject.is_active == True,
            )
            .first()
            is not None
        )
        is_already_active = (
            version.curriculum_status == "active"
            and version.is_active
            and draft.status in ["approved", "active"]
            and has_active_subjects
        )

        # Count active / non-excluded entities
        active_subjects = [s for s in draft.subjects if not getattr(s, "is_excluded", False)]
        active_modules = [
            m for s in active_subjects for m in s.modules if not getattr(m, "is_excluded", False)
        ]
        active_topics = [
            t
            for m in active_modules
            for t in m.topics
            if not getattr(t, "is_excluded", False)
            and getattr(t, "entity_category", "topic") == "topic"
        ]
        lesson_candidates = [
            t for t in active_topics if getattr(t, "is_lesson_candidate", True)
        ]

        review_required_count = 0
        for s in active_subjects:
            if s.review_required or s.is_ambiguous:
                review_required_count += 1
            for m in s.modules:
                if m.review_required or m.is_ambiguous:
                    review_required_count += 1
                for t in m.topics:
                    if getattr(t, "entity_category", "topic") == "topic" and (t.review_required or t.is_ambiguous):
                        review_required_count += 1

        reasons: List[str] = []
        is_eligible = True

        if len(active_subjects) == 0:
            is_eligible = False
            reasons.append("Draft contains no active subjects (all subjects are excluded or missing).")

        if len(active_modules) == 0:
            is_eligible = False
            reasons.append("Draft contains no active modules/units.")

        if draft.status not in ["review_required", "changes_saved", "draft_ready", "draft", "approved", "active"]:
            is_eligible = False
            reasons.append(f"Draft status '{draft.status}' is not eligible for activation.")

        if is_already_active:
            reasons.append("This syllabus version is already the active curriculum.")

        return SyllabusActivationEligibilityResponse(
            is_eligible=is_eligible,
            reasons=reasons,
            subject_count=len(active_subjects),
            module_count=len(active_modules),
            topic_count=len(active_topics),
            lesson_candidate_count=len(lesson_candidates),
            review_required_count=review_required_count,
            is_already_active=is_already_active,
        )

    @classmethod
    def save_draft_corrections(
        cls,
        db: Session,
        user_id: str,
        syllabus_id: str,
        version_id: str,
        corrections: SyllabusDraftCorrectionRequest,
    ) -> SyllabusCurriculumDraft:
        """
        Saves student review corrections to draft subjects, modules, and topics.
        Strictly validates entity ownership, non-empty names, and hierarchy consistency.
        Preserves original evidence text, page numbers, and provenance.
        """
        draft = (
            db.query(SyllabusCurriculumDraft)
            .join(SyllabusVersion, SyllabusVersion.id == SyllabusCurriculumDraft.syllabus_version_id)
            .join(Syllabus, Syllabus.id == SyllabusVersion.syllabus_id)
            .filter(
                SyllabusCurriculumDraft.syllabus_version_id == version_id,
                SyllabusCurriculumDraft.user_id == user_id,
                Syllabus.id == syllabus_id,
            )
            .first()
        )
        if not draft:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Curriculum draft not found or access denied.",
            )

        # 1. Apply Subject Corrections
        for s_corr in corrections.subjects:
            subj = (
                db.query(SyllabusDraftSubject)
                .filter(
                    SyllabusDraftSubject.id == s_corr.id,
                    SyllabusDraftSubject.draft_id == draft.id,
                )
                .first()
            )
            if not subj:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Subject {s_corr.id} not found in this curriculum draft.",
                )

            if s_corr.name is not None:
                cleaned_name = s_corr.name.strip()
                if not cleaned_name:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail="Subject name cannot be empty.",
                    )
                subj.name = cleaned_name
                draft.title = cleaned_name
                syl = db.query(Syllabus).filter(Syllabus.id == syllabus_id).first()
                if syl:
                    syl.title = cleaned_name
                    syl.updated_at = datetime.now(timezone.utc)
                # If subject is already active at runtime, also update runtime name immediately
                rt_sub = (
                    db.query(Subject)
                    .filter(
                        Subject.syllabus_version_id == version_id,
                        Subject.user_id == user_id,
                    )
                    .first()
                )
                if rt_sub:
                    rt_sub.name = cleaned_name

            if s_corr.code is not None:
                subj.code = s_corr.code.strip() or None
            if s_corr.credits is not None:
                subj.credits = s_corr.credits.strip() or None
            if s_corr.semester is not None:
                subj.semester = s_corr.semester.strip() or None
            if s_corr.is_excluded is not None:
                subj.is_excluded = s_corr.is_excluded
            if s_corr.sort_order is not None:
                subj.sort_order = s_corr.sort_order
            if s_corr.review_required is not None:
                subj.review_required = s_corr.review_required

        # 2. Apply Module Corrections
        for m_corr in corrections.modules:
            mod = (
                db.query(SyllabusDraftModule)
                .join(SyllabusDraftSubject, SyllabusDraftSubject.id == SyllabusDraftModule.draft_subject_id)
                .filter(
                    SyllabusDraftModule.id == m_corr.id,
                    SyllabusDraftSubject.draft_id == draft.id,
                )
                .first()
            )
            if not mod:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Module {m_corr.id} not found in this curriculum draft.",
                )

            if m_corr.title is not None:
                cleaned_title = m_corr.title.strip()
                if not cleaned_title:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail="Module title cannot be blank.",
                    )
                mod.title = cleaned_title

            if m_corr.display_label is not None:
                mod.display_label = m_corr.display_label.strip() or "Unit"

            if m_corr.draft_subject_id is not None:
                target_subj = (
                    db.query(SyllabusDraftSubject)
                    .filter(
                        SyllabusDraftSubject.id == m_corr.draft_subject_id,
                        SyllabusDraftSubject.draft_id == draft.id,
                    )
                    .first()
                )
                if not target_subj:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Target subject {m_corr.draft_subject_id} not found in draft.",
                    )
                mod.draft_subject_id = m_corr.draft_subject_id

            if m_corr.is_excluded is not None:
                mod.is_excluded = m_corr.is_excluded
            if m_corr.sort_order is not None:
                mod.sort_order = m_corr.sort_order
            if m_corr.review_required is not None:
                mod.review_required = m_corr.review_required

        # 3. Apply Topic Corrections
        for t_corr in corrections.topics:
            top = (
                db.query(SyllabusDraftTopic)
                .join(SyllabusDraftModule, SyllabusDraftModule.id == SyllabusDraftTopic.draft_module_id)
                .join(SyllabusDraftSubject, SyllabusDraftSubject.id == SyllabusDraftModule.draft_subject_id)
                .filter(
                    SyllabusDraftTopic.id == t_corr.id,
                    SyllabusDraftSubject.draft_id == draft.id,
                )
                .first()
            )
            if not top:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Topic {t_corr.id} not found in this curriculum draft.",
                )

            if t_corr.title is not None:
                cleaned_title = t_corr.title.strip()
                if not cleaned_title:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail="Topic title cannot be blank.",
                    )
                top.title = cleaned_title

            if t_corr.lesson_candidate_title is not None:
                top.lesson_candidate_title = t_corr.lesson_candidate_title.strip() or None

            if t_corr.draft_module_id is not None:
                target_mod = (
                    db.query(SyllabusDraftModule)
                    .join(SyllabusDraftSubject, SyllabusDraftSubject.id == SyllabusDraftModule.draft_subject_id)
                    .filter(
                        SyllabusDraftModule.id == t_corr.draft_module_id,
                        SyllabusDraftSubject.draft_id == draft.id,
                    )
                    .first()
                )
                if not target_mod:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Target module {t_corr.draft_module_id} not found in draft.",
                    )
                top.draft_module_id = t_corr.draft_module_id

            if getattr(t_corr, "entity_category", None) is not None:
                top.entity_category = t_corr.entity_category
            if t_corr.is_lesson_candidate is not None:
                top.is_lesson_candidate = t_corr.is_lesson_candidate
            if t_corr.is_excluded is not None:
                top.is_excluded = t_corr.is_excluded
            if t_corr.sort_order is not None:
                top.sort_order = t_corr.sort_order
            if t_corr.review_required is not None:
                top.review_required = t_corr.review_required

        # 4. Apply Reference Corrections
        if getattr(corrections, "references", None):
            from app.models.syllabus import SyllabusDraftReference
            for r_corr in corrections.references:
                ref = (
                    db.query(SyllabusDraftReference)
                    .filter(
                        SyllabusDraftReference.id == r_corr.id,
                        SyllabusDraftReference.draft_id == draft.id,
                    )
                    .first()
                )
                if not ref:
                    continue
                if r_corr.title is not None and r_corr.title.strip():
                    ref.title = r_corr.title.strip()
                if r_corr.reference_type is not None:
                    ref.reference_type = r_corr.reference_type
                if r_corr.authors is not None:
                    ref.authors = r_corr.authors.strip() or None
                if r_corr.publisher is not None:
                    ref.publisher = r_corr.publisher.strip() or None
                if r_corr.edition is not None:
                    ref.edition = r_corr.edition.strip() or None
                if r_corr.url is not None:
                    ref.url = r_corr.url.strip() or None
                if r_corr.sort_order is not None:
                    ref.sort_order = r_corr.sort_order

        draft.status = "changes_saved"
        draft.updated_at = datetime.now(timezone.utc)
        # If the version was not already active, mark version.curriculum_status = "changes_saved"
        version = db.query(SyllabusVersion).filter(SyllabusVersion.id == version_id).first()
        if version and version.curriculum_status != "active":
            version.curriculum_status = "changes_saved"
            version.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(draft)

        ref_count = len(getattr(corrections, "references", []))
        logger.info(
            f"[SyllabusActivationService] Saved corrections for draft {draft.id} "
            f"(subjects: {len(corrections.subjects)}, modules: {len(corrections.modules)}, topics: {len(corrections.topics)}, references: {ref_count})"
        )
        return draft

    @classmethod
    def activate_curriculum(
        cls,
        db: Session,
        user_id: str,
        syllabus_id: str,
        version_id: str,
        target_context_id: Optional[str] = None,
    ) -> SyllabusCurriculumActivationResponse:
        """
        Master Prompt 05R: Authoritative, Atomic Curriculum Activation.

        Atomically translates approved draft entities into active runtime learning records:
        - Creates runtime Subject, Topic, Concept, LearningModule, Lesson records.
        - Enrolls student via StudentSubject in their active academic context.
        - Deactivates previous active curriculum versions without deleting historical records.
        - Idempotently safe against retries and duplicate submissions.
        - Updates canonical syllabus and version state to State D (is_curriculum_active = True).
        """
        # 1. Enforce strict authentication & ownership
        syllabus = (
            db.query(Syllabus)
            .filter(Syllabus.id == syllabus_id, Syllabus.user_id == user_id)
            .first()
        )
        if not syllabus:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Syllabus not found or access denied.",
            )

        version = (
            db.query(SyllabusVersion)
            .filter(
                SyllabusVersion.id == version_id,
                SyllabusVersion.syllabus_id == syllabus_id,
            )
            .first()
        )
        if not version:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Syllabus version not found.",
            )

        draft = (
            db.query(SyllabusCurriculumDraft)
            .filter(
                SyllabusCurriculumDraft.syllabus_version_id == version_id,
                SyllabusCurriculumDraft.user_id == user_id,
            )
            .order_by(SyllabusCurriculumDraft.compilation_version.desc())
            .first()
        )
        if not draft:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No persistent curriculum draft found for this syllabus version. Compile draft first.",
            )

        # 2. Academic Context Resolution & Validation
        resolved_ctx = AcademicContextResolver.resolve_context(db, user_id)
        effective_context_id = target_context_id or syllabus.academic_context_id or resolved_ctx.context_id
        canonical_level = resolved_ctx.academic_level or syllabus.academic_level or "undergraduate"

        # 3. Eligibility Check
        active_subjects = [s for s in draft.subjects if not getattr(s, "is_excluded", False)]
        if not active_subjects:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot activate curriculum: All subjects in the draft have been excluded.",
            )

        active_modules = [
            m for s in active_subjects for m in s.modules if not getattr(m, "is_excluded", False)
        ]
        if not active_modules:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot activate curriculum: No active units/modules found in draft.",
            )

        # 4. Check existing runtime subjects and topics for this version
        existing_version_subjects = (
            db.query(Subject)
            .filter(
                Subject.syllabus_version_id == version.id,
                Subject.user_id == user_id,
                Subject.is_active == True,
            )
            .all()
        )
        total_runtime_topics = (
            db.query(Topic).join(Subject).filter(
                Subject.syllabus_version_id == version.id,
                Subject.user_id == user_id,
                Subject.is_active == True,
                Topic.is_active == True,
            ).count()
        )
        if (
            version.is_active
            and version.curriculum_status == "active"
            and draft.status == "approved"
            and existing_version_subjects
            and total_runtime_topics == len(active_modules)
        ):
            logger.info(f"[SyllabusActivationService] Version {version_id} already active and up to date. Returning idempotent result.")
            now_time = version.activated_at or datetime.now(timezone.utc)
            total_concepts = db.query(Concept).join(Topic).join(Subject).filter(Subject.syllabus_version_id == version.id).count()
            total_lessons = db.query(Lesson).join(LearningModule).join(Concept).join(Topic).join(Subject).filter(Subject.syllabus_version_id == version.id).count()

            return SyllabusCurriculumActivationResponse(
                syllabus_id=syllabus.id,
                version_id=version.id,
                draft_id=draft.id,
                academic_context_id=effective_context_id,
                status="active",
                curriculum_status="active",
                is_curriculum_active=True,
                subjects_activated=len(existing_version_subjects),
                modules_activated=total_runtime_topics,
                topics_activated=total_concepts,
                lessons_activated=total_lessons,
                activated_at=now_time,
                message="Curriculum is already active and up to date.",
            )

        # 5. Atomic Transaction: Supersession & Runtime Entity Translation
        try:
            # Step A: Supersession Policy
            # Deactivate any previous active version for this syllabus or student in this context
            sibling_versions = (
                db.query(SyllabusVersion)
                .filter(
                    SyllabusVersion.syllabus_id == syllabus.id,
                    SyllabusVersion.id != version.id,
                    SyllabusVersion.is_active == True,
                )
                .all()
            )
            for prev_v in sibling_versions:
                prev_v.is_active = False
                prev_v.curriculum_status = "archived"
                prev_subjs = [s.id for s in db.query(Subject.id).filter(
                    Subject.syllabus_version_id == prev_v.id,
                    Subject.user_id == user_id,
                ).all()]
                if prev_subjs:
                    db.query(Subject).filter(Subject.id.in_(prev_subjs)).update({"is_active": False}, synchronize_session="fetch")
                    db.query(StudentSubject).filter(
                        StudentSubject.user_id == user_id,
                        StudentSubject.subject_id.in_(prev_subjs),
                    ).update({"is_active": False}, synchronize_session="fetch")

            # Also supersede other syllabi for the same user in this academic context if applicable
            other_active_syllabi = (
                db.query(Syllabus)
                .filter(
                    Syllabus.user_id == user_id,
                    Syllabus.id != syllabus.id,
                    Syllabus.academic_context_id == effective_context_id,
                    Syllabus.status == "active",
                )
                .all()
            )
            for other_syl in other_active_syllabi:
                for other_ver in other_syl.versions:
                    if other_ver.is_active:
                        other_ver.is_active = False
                        other_ver.curriculum_status = "archived"
                        other_subjs = [s.id for s in db.query(Subject.id).filter(
                            Subject.syllabus_version_id == other_ver.id,
                            Subject.user_id == user_id,
                        ).all()]
                        if other_subjs:
                            db.query(Subject).filter(Subject.id.in_(other_subjs)).update({"is_active": False}, synchronize_session="fetch")
                            db.query(StudentSubject).filter(
                                StudentSubject.user_id == user_id,
                                StudentSubject.subject_id.in_(other_subjs),
                            ).update({"is_active": False}, synchronize_session="fetch")
                other_syl.status = "archived"

            # Step B: Translate Approved Draft Hierarchy into Runtime Learning Entities
            subjects_activated = 0
            modules_activated = 0
            topics_activated = 0
            lessons_activated = 0

            existing_subjects = (
                db.query(Subject)
                .filter(
                    Subject.syllabus_version_id == version.id,
                    Subject.user_id == user_id,
                )
                .order_by(Subject.order_index.asc())
                .all()
            )

            # Synchronize each active draft subject
            for idx, d_subj in enumerate(active_subjects):
                if idx < len(existing_subjects):
                    runtime_subject = existing_subjects[idx]
                    runtime_subject.name = d_subj.name
                    runtime_subject.description = d_subj.evidence_text or f"Curriculum subject extracted from {syllabus.title} (v{version.version_number})"
                    runtime_subject.education_level = canonical_level
                    runtime_subject.academic_domain = resolved_ctx.academic_domain or syllabus.program_degree or "General"
                    runtime_subject.is_active = True
                else:
                    subj_slug = _generate_unique_slug(db, Subject, d_subj.name, prefix=d_subj.code or "subj")
                    runtime_subject = Subject(
                        id=str(uuid.uuid4()),
                        curriculum_id=None,
                        name=d_subj.name,
                        slug=subj_slug,
                        description=d_subj.evidence_text or f"Curriculum subject extracted from {syllabus.title} (v{version.version_number})",
                        icon="BookOpen",
                        category=resolved_ctx.academic_domain or syllabus.program_degree or "General",
                        difficulty_level="all-levels",
                        education_level=canonical_level,
                        academic_domain=resolved_ctx.academic_domain or syllabus.program_degree or "General",
                        is_system=False,
                        created_by_user_id=user_id,
                        user_id=user_id,
                        syllabus_version_id=version.id,
                        content_source="syllabus_extracted",
                        order_index=d_subj.sort_order if d_subj.sort_order is not None else idx,
                        is_active=True,
                    )
                    db.add(runtime_subject)
                    db.flush()

                subjects_activated += 1
                subj_id = runtime_subject.id

                # Ensure active student enrollment link
                enrollment = (
                    db.query(StudentSubject)
                    .filter(
                        StudentSubject.user_id == user_id,
                        StudentSubject.subject_id == subj_id,
                    )
                    .first()
                )
                if enrollment:
                    enrollment.is_active = True
                    enrollment.academic_level = canonical_level
                else:
                    new_enrollment = StudentSubject(
                        user_id=user_id,
                        subject_id=subj_id,
                        academic_level=canonical_level,
                        enrollment_source="curriculum_prescribed",
                        is_active=True,
                    )
                    db.add(new_enrollment)
                    db.flush()

                # Clean up old runtime child entities (topics, concepts, learning_modules, lessons)
                # to strictly eliminate any stale OCR fragments or superseded topics
                old_topic_ids = [t.id for t in db.query(Topic.id).filter(Topic.subject_id == subj_id).all()]
                if old_topic_ids:
                    old_concept_ids = [c.id for c in db.query(Concept.id).filter(Concept.topic_id.in_(old_topic_ids)).all()]
                    if old_concept_ids:
                        old_lm_ids = [lm.id for lm in db.query(LearningModule.id).filter(LearningModule.concept_id.in_(old_concept_ids)).all()]
                        if old_lm_ids:
                            db.query(Lesson).filter(Lesson.module_id.in_(old_lm_ids)).delete(synchronize_session="fetch")
                            db.query(LearningModule).filter(LearningModule.id.in_(old_lm_ids)).delete(synchronize_session="fetch")
                        db.query(Concept).filter(Concept.id.in_(old_concept_ids)).delete(synchronize_session="fetch")
                    db.query(Topic).filter(Topic.id.in_(old_topic_ids)).delete(synchronize_session="fetch")
                    db.flush()

                # Build fresh runtime hierarchy from draft modules and topics
                for d_mod in d_subj.modules:
                    if getattr(d_mod, "is_excluded", False):
                        continue

                    mod_label = d_mod.original_label or d_mod.display_label or "Unit"
                    if d_mod.title and mod_label.lower() not in d_mod.title.lower():
                        mod_full_name = f"{mod_label} - {d_mod.title}".strip(" -")
                    else:
                        mod_full_name = d_mod.title or mod_label

                    runtime_topic = Topic(
                        id=str(uuid.uuid4()),
                        subject_id=subj_id,
                        content_source="syllabus_extracted",
                        name=mod_full_name,
                        slug=_generate_unique_slug(db, Topic, mod_full_name),
                        description=d_mod.evidence_text or f"Module extracted from {d_subj.name}",
                        order_index=d_mod.sort_order if d_mod.sort_order is not None else modules_activated,
                        is_active=True,
                    )
                    db.add(runtime_topic)
                    db.flush()
                    modules_activated += 1

                    for d_top in d_mod.topics:
                        if getattr(d_top, "is_excluded", False):
                            continue
                        if not getattr(d_top, "is_lesson_candidate", True):
                            continue
                        if getattr(d_top, "entity_category", "topic") in ["metadata", "reference"]:
                            continue

                        top_name = d_top.lesson_candidate_title or d_top.title
                        is_lab = any(
                            k in top_name.lower() or k in mod_full_name.lower()
                            for k in ["lab", "practical", "experiment", "implementation"]
                        )

                        runtime_concept = Concept(
                            id=str(uuid.uuid4()),
                            topic_id=runtime_topic.id,
                            content_source="syllabus_extracted",
                            name=top_name,
                            slug=_generate_unique_slug(db, Concept, top_name),
                            summary=d_top.evidence_text or f"Concept extracted from {syllabus.title}",
                            short_description=f"Curriculum candidate: {top_name}",
                            difficulty="intermediate",
                            difficulty_level="intermediate",
                            order_index=d_top.sort_order if d_top.sort_order is not None else topics_activated,
                            is_active=True,
                            has_simulation=True,
                            has_visualization=True,
                            has_practice=True,
                            has_lab=is_lab,
                            has_mindmap=True,
                            learning_modes=["learn", "ask", "practice", "notes"] + (["lab"] if is_lab else []),
                        )
                        db.add(runtime_concept)
                        db.flush()
                        topics_activated += 1

                        # Structured LearningModule
                        runtime_lm = LearningModule(
                            id=str(uuid.uuid4()),
                            concept_id=runtime_concept.id,
                            content_source="syllabus_extracted",
                            title=top_name,
                            slug=_generate_unique_slug(db, LearningModule, top_name),
                            description=d_top.evidence_text or f"Structured module for {top_name}",
                            learning_objective=f"Understand and master concepts of {top_name} as outlined in syllabus.",
                            difficulty_level="intermediate",
                            estimated_minutes=15,
                            order_index=0,
                            is_active=True,
                        )
                        db.add(runtime_lm)
                        db.flush()

                        # Lesson
                        citation = f"Source: {syllabus.title}, Page {d_top.source_page or 1}"
                        runtime_lesson = Lesson(
                            id=str(uuid.uuid4()),
                            module_id=runtime_lm.id,
                            content_source="syllabus_extracted",
                            title=top_name,
                            slug=_generate_unique_slug(db, Lesson, top_name),
                            content_type="explanation",
                            content=f"# {top_name}\n\n*{citation}*\n\nEvidence from Syllabus:\n> {d_top.evidence_text or 'Extracted topic from verified syllabus.'}\n\n*Lesson instruction and interactive concepts will be developed during learning sessions.*",
                            order_index=0,
                            estimated_minutes=15,
                            is_active=True,
                        )
                        db.add(runtime_lesson)
                        lessons_activated += 1

            # Deactivate any excess subjects beyond active_subjects
            if len(existing_subjects) > len(active_subjects):
                for extra_subj in existing_subjects[len(active_subjects):]:
                    extra_subj.is_active = False

            # Step C: Finalize Statuses
            now_dt = datetime.now(timezone.utc)
            draft.status = "approved"
            draft.updated_at = now_dt

            version.is_active = True
            version.status = "active"
            version.curriculum_status = "active"
            version.processing_status = "completed"
            version.activated_at = now_dt

            syllabus.status = "active"
            syllabus.updated_at = now_dt

            db.commit()

            logger.info(
                f"[SyllabusActivationService] Successfully activated curriculum: "
                f"user={user_id[:8]} syllabus={syllabus.id} version={version.id} "
                f"subjects={subjects_activated} modules={modules_activated} topics={topics_activated} lessons={lessons_activated}"
            )

            return SyllabusCurriculumActivationResponse(
                syllabus_id=syllabus.id,
                version_id=version.id,
                draft_id=draft.id,
                academic_context_id=effective_context_id,
                status="active",
                curriculum_status="active",
                is_curriculum_active=True,
                subjects_activated=subjects_activated,
                modules_activated=modules_activated,
                topics_activated=topics_activated,
                lessons_activated=lessons_activated,
                activated_at=now_dt,
                message=f"Curriculum successfully activated with {subjects_activated} subjects and {modules_activated} units.",
            )

        except Exception as e:
            db.rollback()
            logger.exception(f"[SyllabusActivationService] Activation failed for syllabus {syllabus_id} version {version_id}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Curriculum activation failed: {str(e)}",
            )

    @classmethod
    def deactivate_curriculum(
        cls,
        db: Session,
        user_id: str,
        syllabus_id: str,
        version_id: str,
    ) -> SyllabusCurriculumActivationResponse:
        """
        Master Prompt 05R: Safe Return to Review / Deactivation Operation.
        Safely returns an active curriculum to review (State C):
        - Enforces strict student ownership and academic context scoping.
        - Atomically soft-deactivates runtime subjects for this version (is_active = False).
        - Sets version.curriculum_status = 'review_required'.
        - Sets draft.status = 'review_required'.
        - Non-destructively preserves the syllabus, versions, drafts, corrections, and learning history.
        - Updates canonical state so workspace immediately reflects State C.
        """
        syllabus = (
            db.query(Syllabus)
            .filter(Syllabus.id == syllabus_id, Syllabus.user_id == user_id)
            .first()
        )
        if not syllabus:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Syllabus not found or access denied.",
            )

        version = (
            db.query(SyllabusVersion)
            .filter(
                SyllabusVersion.id == version_id,
                SyllabusVersion.syllabus_id == syllabus_id,
            )
            .first()
        )
        if not version:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Syllabus version not found.",
            )

        draft = (
            db.query(SyllabusCurriculumDraft)
            .filter(
                SyllabusCurriculumDraft.syllabus_version_id == version_id,
                SyllabusCurriculumDraft.user_id == user_id,
            )
            .first()
        )
        if not draft:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No persistent curriculum draft found for this syllabus version.",
            )

        resolved_ctx = AcademicContextResolver.resolve_context(db, user_id)
        effective_context_id = syllabus.academic_context_id or resolved_ctx.context_id

        try:
            # 1. Soft-deactivate runtime subjects and student subjects for this syllabus version
            # Preserves records, progress, and relationships non-destructively
            subj_ids = [
                s.id for s in db.query(Subject.id).filter(
                    Subject.syllabus_version_id == version.id,
                    Subject.user_id == user_id,
                ).all()
            ]
            if subj_ids:
                db.query(Subject).filter(
                    Subject.id.in_(subj_ids),
                ).update({"is_active": False}, synchronize_session="fetch")

                db.query(StudentSubject).filter(
                    StudentSubject.user_id == user_id,
                    StudentSubject.subject_id.in_(subj_ids),
                ).update({"is_active": False}, synchronize_session="fetch")

            # 2. Update lifecycle states back to State C
            now_dt = datetime.now(timezone.utc)
            version.curriculum_status = "review_required"
            version.updated_at = now_dt

            draft.status = "review_required"
            draft.updated_at = now_dt

            # Check if any other syllabus version is active
            other_active_ver = (
                db.query(SyllabusVersion)
                .filter(
                    SyllabusVersion.syllabus_id == syllabus.id,
                    SyllabusVersion.id != version.id,
                    SyllabusVersion.curriculum_status == "active",
                )
                .first()
            )
            if not other_active_ver and syllabus.status == "active":
                syllabus.status = "uploaded"
                syllabus.updated_at = now_dt

            db.commit()

            logger.info(
                f"[SyllabusActivationService] Safely returned curriculum to review: "
                f"user={user_id[:8]} syllabus={syllabus.id} version={version.id}"
            )

            return SyllabusCurriculumActivationResponse(
                syllabus_id=syllabus.id,
                version_id=version.id,
                draft_id=draft.id,
                academic_context_id=effective_context_id,
                status="review_required",
                curriculum_status="review_required",
                is_curriculum_active=False,
                subjects_activated=0,
                modules_activated=0,
                topics_activated=0,
                lessons_activated=0,
                activated_at=now_dt,
                message="Curriculum draft successfully returned to review. Active learning workspace is paused until re-activation.",
            )
        except Exception as e:
            db.rollback()
            logger.exception(f"[SyllabusActivationService] Return to review failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to return curriculum to review: {str(e)}",
            )
