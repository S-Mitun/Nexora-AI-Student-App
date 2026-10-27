import os
import uuid
import threading
from datetime import datetime
from typing import Optional, Tuple
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.core.logging import logger
from app.db.session import SessionLocal
from app.models.syllabus import (
    Syllabus,
    SyllabusVersion,
    SyllabusProcessingJob,
    SyllabusCurriculumDraft,
    SyllabusDraftSubject,
    SyllabusDraftModule,
    SyllabusDraftTopic,
    SyllabusDraftOutcome,
)
from app.services.learning.context_service import AcademicContextResolver
from app.services.syllabus.extraction import get_document_extractor
from app.services.syllabus.draft_engine import SyllabusDraftEngine


class SyllabusJobRunner:
    """
    Background and synchronous job coordinator for Syllabus document understanding.
    Handles lifecycle:
    queued -> extracting -> analyzing -> completed (or failed)
    Persists structured curriculum drafts with full evidence and source traceability.
    """

    @classmethod
    def get_job_status(
        cls,
        db: Session,
        syllabus_id: str,
        version_id: str,
        user_id: str,
    ) -> Optional[SyllabusProcessingJob]:
        """Fetches the latest processing job for a given syllabus version, scoped by user_id."""
        return (
            db.query(SyllabusProcessingJob)
            .filter(
                SyllabusProcessingJob.syllabus_id == syllabus_id,
                SyllabusProcessingJob.version_id == version_id,
                SyllabusProcessingJob.user_id == user_id,
            )
            .order_by(SyllabusProcessingJob.started_at.desc())
            .first()
        )

    @classmethod
    def get_version_draft(
        cls,
        db: Session,
        syllabus_id: str,
        version_id: str,
        user_id: str,
    ) -> Optional[SyllabusCurriculumDraft]:
        """Fetches the curriculum draft for a given syllabus version, scoped by user_id."""
        return (
            db.query(SyllabusCurriculumDraft)
            .filter(
                SyllabusCurriculumDraft.syllabus_id == syllabus_id,
                SyllabusCurriculumDraft.syllabus_version_id == version_id,
                SyllabusCurriculumDraft.user_id == user_id,
            )
            .order_by(SyllabusCurriculumDraft.compilation_version.desc())
            .first()
        )

    @classmethod
    def start_processing_job(
        cls,
        db: Session,
        syllabus_id: str,
        version_id: str,
        user_id: str,
        academic_context_id: Optional[str] = None,
        force_reprocess: bool = False,
        run_async: bool = True,
    ) -> SyllabusProcessingJob:
        """
        Initializes or resumes a document understanding processing job.
        If a job is currently in progress and not forced, returns the existing job.
        Otherwise creates a new job record and dispatches execution.
        """
        # 1. Verify syllabus and version exist and belong to user
        syllabus = (
            db.query(Syllabus)
            .filter(Syllabus.id == syllabus_id, Syllabus.user_id == user_id)
            .first()
        )
        if not syllabus:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Syllabus '{syllabus_id}' not found or access denied.",
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
                detail=f"Syllabus version '{version_id}' not found.",
            )

        # 2. Check for active job
        existing_job = cls.get_job_status(db, syllabus_id, version_id, user_id)
        if existing_job and existing_job.status in ["queued", "extracting", "analyzing"] and not force_reprocess:
            logger.info(f"[JobRunner] Job {existing_job.id} already active for version {version_id}.")
            return existing_job

        effective_context_id = academic_context_id or syllabus.academic_context_id

        # 3. Create new job record
        job_id = str(uuid.uuid4())
        job = SyllabusProcessingJob(
            id=job_id,
            syllabus_id=syllabus_id,
            syllabus_version_id=version_id,
            user_id=user_id,
            academic_context_id=effective_context_id,
            status="queued",
            stage="queued",
            progress_percent=0,
            total_pages=0,
            processed_pages=0,
            started_at=datetime.utcnow(),
        )
        db.add(job)

        version.processing_status = "processing"
        db.commit()
        db.refresh(job)

        logger.info(f"[JobRunner] Created processing job {job_id} for version {version_id}")

        # 4. Dispatch processing
        if run_async:
            thread = threading.Thread(
                target=cls._execute_job_in_thread,
                args=(job_id, syllabus_id, version_id, user_id, effective_context_id),
                daemon=True,
            )
            thread.start()
        else:
            cls._execute_job(db, job_id, syllabus_id, version_id, user_id, effective_context_id)
            db.refresh(job)

        return job

    @classmethod
    def _execute_job_in_thread(
        cls,
        job_id: str,
        syllabus_id: str,
        version_id: str,
        user_id: str,
        academic_context_id: Optional[str],
    ):
        """Worker thread entry point with a fresh isolated DB session."""
        db = SessionLocal()
        try:
            cls._execute_job(db, job_id, syllabus_id, version_id, user_id, academic_context_id)
        finally:
            db.close()

    @classmethod
    def _execute_job(
        cls,
        db: Session,
        job_id: str,
        syllabus_id: str,
        version_id: str,
        user_id: str,
        academic_context_id: Optional[str],
    ):
        """Authoritative execution of syllabus document extraction and draft generation."""
        job = db.query(SyllabusProcessingJob).filter(SyllabusProcessingJob.id == job_id).first()
        version = db.query(SyllabusVersion).filter(SyllabusVersion.id == version_id).first()
        syllabus = db.query(Syllabus).filter(Syllabus.id == syllabus_id).first()

        if not job or not version or not syllabus:
            logger.error(f"[JobRunner] Job {job_id} execution aborted: missing entity references.")
            return

        try:
            # Stage 1: File Location & Extraction
            job.status = "extracting"
            job.stage = "Locating syllabus file and initializing document extractor..."
            job.progress_percent = 15
            db.commit()

            file_path = version.storage_path
            if not os.path.exists(file_path):
                # Check relative from current directory
                norm_path = os.path.normpath(file_path)
                if not os.path.exists(norm_path):
                    raise FileNotFoundError(f"Syllabus file does not exist on disk at path: {file_path}")
                file_path = norm_path

            extractor = get_document_extractor(file_path)
            logger.info(f"[JobRunner] Using {extractor.__class__.__name__} for '{file_path}'")

            job.stage = "Extracting document text and applying OCR fallback where required..."
            job.progress_percent = 30
            db.commit()

            extracted_doc = extractor.extract(file_path)

            job.total_pages = extracted_doc.total_pages
            job.processed_pages = extracted_doc.total_pages
            job.progress_percent = 65
            job.status = "analyzing"
            job.stage = "Analyzing curriculum structure, course metadata, units, and learning outcomes..."
            db.commit()

            # Stage 2: Curriculum Draft Understanding
            resolved_ctx = AcademicContextResolver.resolve_context(db, user_id)
            academic_level = syllabus.academic_level or resolved_ctx.academic_level or "Undergraduate"
            institution = syllabus.institution or resolved_ctx.institution

            draft_structure = SyllabusDraftEngine.parse_document(
                doc=extracted_doc,
                syllabus_title=syllabus.title,
                academic_level=academic_level,
                institution=institution,
            )

            # Stage 3: Atomic Persistence of Draft Entities
            job.stage = "Persisting structured curriculum draft and evidence citations..."
            job.progress_percent = 85
            db.commit()

            # Remove any existing draft for this version to ensure clean idempotency
            existing_draft = (
                db.query(SyllabusCurriculumDraft)
                .filter(SyllabusCurriculumDraft.syllabus_version_id == version_id)
                .first()
            )
            if existing_draft:
                db.delete(existing_draft)
                db.flush()

            # Create new Draft record
            draft_id = str(uuid.uuid4())
            new_draft = SyllabusCurriculumDraft(
                id=draft_id,
                syllabus_version_id=version_id,
                syllabus_id=syllabus_id,
                user_id=user_id,
                academic_context_id=academic_context_id,
                title=draft_structure.title,
                academic_level=draft_structure.academic_level,
                institution=draft_structure.institution,
                raw_text_summary=draft_structure.raw_summary,
                overall_confidence=draft_structure.overall_confidence,
                status="review_required",
            )
            db.add(new_draft)
            db.flush()

            # Persist Draft Subjects, Modules, Topics, and Outcomes
            for subj_idx, raw_subj in enumerate(draft_structure.subjects):
                subject_id = str(uuid.uuid4())
                draft_subj = SyllabusDraftSubject(
                    id=subject_id,
                    draft_id=draft_id,
                    name=raw_subj.name,
                    code=raw_subj.code,
                    credits=raw_subj.credits,
                    semester=raw_subj.semester,
                    source_page=raw_subj.source_page,
                    evidence_text=raw_subj.evidence_text,
                    confidence=raw_subj.confidence,
                    sort_order=raw_subj.sort_order or (subj_idx + 1),
                )
                db.add(draft_subj)
                db.flush()

                # Modules
                for mod_idx, raw_mod in enumerate(raw_subj.modules):
                    module_id = str(uuid.uuid4())
                    draft_mod = SyllabusDraftModule(
                        id=module_id,
                        draft_subject_id=subject_id,
                        title=raw_mod.title,
                        display_label=raw_mod.display_label,
                        source_page=raw_mod.source_page,
                        evidence_text=raw_mod.evidence_text,
                        confidence=raw_mod.confidence,
                        sort_order=raw_mod.sort_order or (mod_idx + 1),
                    )
                    db.add(draft_mod)
                    db.flush()

                    # Topics
                    for top_idx, raw_top in enumerate(raw_mod.topics):
                        topic_id = str(uuid.uuid4())
                        draft_top = SyllabusDraftTopic(
                            id=topic_id,
                            draft_module_id=module_id,
                            title=raw_top.title,
                            source_page=raw_top.source_page,
                            evidence_text=raw_top.evidence_text,
                            confidence=raw_top.confidence,
                            sort_order=raw_top.sort_order or (top_idx + 1),
                        )
                        db.add(draft_top)

                # Outcomes
                for out_idx, raw_out in enumerate(raw_subj.outcomes):
                    outcome_id = str(uuid.uuid4())
                    draft_out = SyllabusDraftOutcome(
                        id=outcome_id,
                        draft_subject_id=subject_id,
                        outcome_type=raw_out.outcome_type,
                        description=raw_out.description,
                        source_page=raw_out.source_page,
                        evidence_text=raw_out.evidence_text,
                        confidence=raw_out.confidence,
                        sort_order=out_idx + 1,
                    )
                    db.add(draft_out)

            # Update version status:
            # - processing_status = "completed"
            # - curriculum_status = "review_required" (State C)
            # CRITICAL: is_curriculum_active stays False!
            version.processing_status = "completed"
            version.curriculum_status = "review_required"
            version.extracted_metadata = {
                "pages_count": extracted_doc.total_pages,
                "scanned_pages_count": extracted_doc.scanned_pages_count,
                "ocr_applied": extracted_doc.ocr_applied,
                "subjects_count": len(draft_structure.subjects),
                "modules_count": sum(len(s.modules) for s in draft_structure.subjects),
                "total_topics_count": sum(len(m.topics) for s in draft_structure.subjects for m in s.modules),
                "outcomes_count": sum(len(s.outcomes) for s in draft_structure.subjects),
                "analyzed_at": datetime.utcnow().isoformat(),
            }

            # Complete Job
            job.status = "completed"
            job.stage = "Curriculum draft extraction complete. Ready for student review."
            job.progress_percent = 100
            job.completed_at = datetime.utcnow()
            job.error_message = None

            db.commit()
            logger.info(f"[JobRunner] Job {job_id} successfully completed for version {version_id}.")

        except Exception as e:
            logger.exception(f"[JobRunner] Processing failed for job {job_id}: {e}")
            db.rollback()
            try:
                job.status = "failed"
                job.stage = "Processing failed"
                job.error_message = str(e)
                job.completed_at = datetime.utcnow()
                version.processing_status = "failed"
                db.commit()
            except Exception as inner_err:
                logger.error(f"[JobRunner] Failed to record error state: {inner_err}")
