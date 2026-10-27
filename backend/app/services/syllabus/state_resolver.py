import os
from typing import Optional
from sqlalchemy.orm import Session

from app.models.syllabus import Syllabus, SyllabusVersion
from app.schemas.syllabus import SyllabusCanonicalStateResponse
from app.services.learning.context_service import AcademicContextResolver
from app.core.logging import logger


class SyllabusStateResolver:
    """
    Authoritative Syllabus State Resolver.
    Provides the single source of truth across the full stack for:
    - Does this student have a syllabus for the active academic context?
    - What is the upload, processing, and curriculum lifecycle state?
    - Is the curriculum active?
    Reads directly from PostgreSQL / database tables; never infers state from UI or local storage.
    """

    @classmethod
    def resolve_state(
        cls,
        db: Session,
        user_id: str,
        target_context_id: Optional[str] = None,
    ) -> SyllabusCanonicalStateResponse:
        """
        Resolves the canonical syllabus state for the student's active academic context.
        """
        # 1. Resolve active student academic context
        academic_context = AcademicContextResolver.resolve_context(db, user_id)
        effective_context_id = target_context_id or academic_context.context_id
        canonical_level = academic_context.academic_level

        # 2. Query Syllabus scoped strictly to authenticated user and active context
        syllabus_query = (
            db.query(Syllabus)
            .filter(Syllabus.user_id == user_id)
        )

        # Context-matching logic: exact context_id or normalized academic_level match
        user_syllabi = syllabus_query.all()
        context_syllabi = [
            s for s in user_syllabi
            if s.academic_context_id == effective_context_id
            or (s.academic_level and AcademicContextResolver.level_matches(s.academic_level, canonical_level))
        ]
        if not context_syllabi and user_syllabi:
            context_syllabi = user_syllabi

        if not context_syllabi:
            # STATE A: No syllabus exists for this student in this context
            return SyllabusCanonicalStateResponse(
                has_syllabus=False,
                syllabus_id=None,
                current_version_id=None,
                academic_context_id=effective_context_id,
                upload_status=None,
                processing_status="not_started",
                curriculum_status="none",
                is_curriculum_active=False,
                is_runtime_ready=False,
                rag_status="not_indexed",
                title=None,
                active_version_number=None,
                source_filename=None,
                file_size_bytes=None,
                document_role="syllabus",
                updated_at=None,
            )

        # Determine active syllabus:
        # 1. Syllabus with a version currently marked is_active
        active_syllabus = next((s for s in context_syllabi if any(v.is_active for v in s.versions)), None)
        # 2. Syllabus with status == 'active'
        if not active_syllabus:
            active_syllabus = next((s for s in context_syllabi if s.status == "active"), None)
        # 3. Exact academic_context_id match with most recent update
        if not active_syllabus:
            matching_ctx = [s for s in context_syllabi if s.academic_context_id == effective_context_id]
            if matching_ctx:
                active_syllabus = sorted(matching_ctx, key=lambda s: s.updated_at or s.created_at, reverse=True)[0]
            else:
                active_syllabus = sorted(context_syllabi, key=lambda s: s.updated_at or s.created_at, reverse=True)[0]

        # 3. Determine target version (active document takes highest precedence, then curriculum active, then latest version)
        versions = active_syllabus.versions
        active_ver = next((v for v in versions if v.is_active), None)
        curriculum_active_ver = next((v for v in versions if v.curriculum_status == "active"), None)
        latest_ver = max(versions, key=lambda v: v.version_number) if versions else None
        target_version: Optional[SyllabusVersion] = active_ver or curriculum_active_ver or latest_ver

        if not target_version:
            # Syllabus record exists but has no versions (transient State B)
            return SyllabusCanonicalStateResponse(
                has_syllabus=True,
                syllabus_id=active_syllabus.id,
                current_version_id=None,
                academic_context_id=active_syllabus.academic_context_id or effective_context_id,
                upload_status=active_syllabus.status or "uploaded",
                processing_status="not_started",
                curriculum_status="not_built",
                is_curriculum_active=False,
                is_runtime_ready=False,
                rag_status="not_indexed",
                title=active_syllabus.title,
                active_version_number=None,
                source_filename=None,
                file_size_bytes=None,
                document_role="syllabus",
                updated_at=active_syllabus.updated_at,
            )

        # 4. Storage consistency check
        storage_verified = False
        if target_version.storage_path and os.path.exists(target_version.storage_path):
            storage_verified = True
        elif target_version.status != "failed":
            logger.warning(
                f"[SyllabusStateResolver] Storage object missing at {target_version.storage_path} "
                f"for version {target_version.id}"
            )

        # 5. Resolve upload_status
        if target_version.status == "failed":
            upload_status = "failed"
        elif storage_verified:
            upload_status = "verified"
        elif target_version.storage_path and not os.path.exists(target_version.storage_path):
            upload_status = "missing_file"
        else:
            upload_status = target_version.upload_status or "uploaded"

        # 6. Resolve curriculum_status & is_curriculum_active
        draft = target_version.curriculum_draft

        # Authoritative check for runtime learning subjects belonging to this syllabus version
        from app.models.learning import Subject
        has_runtime_subjects = (
            db.query(Subject)
            .filter(
                Subject.syllabus_version_id == target_version.id,
                Subject.user_id == user_id,
                Subject.is_active == True,
            )
            .first()
            is not None
        )

        if (
            target_version.curriculum_status == "active"
            and (target_version.is_active or has_runtime_subjects)
            and (draft is None or draft.status in ["approved", "active", "changes_saved"])
        ):
            # STATE D: Curriculum active
            curriculum_status = "active"
            is_curriculum_active = True
        elif draft and draft.status in ["review_required", "draft", "changes_saved", "draft_ready"]:
            # STATE C: Draft exists and is awaiting review or has saved changes
            curriculum_status = "changes_saved" if draft.status == "changes_saved" else ("review_required" if draft.status in ["review_required", "draft_ready"] else "draft")
            is_curriculum_active = False
        elif target_version.curriculum_status in ["review_required", "draft", "changes_saved"]:
            # STATE C: Version explicitly marked as review_required or changes_saved
            curriculum_status = target_version.curriculum_status
            is_curriculum_active = False
        elif target_version.curriculum_status == "archived":
            curriculum_status = "archived"
            is_curriculum_active = False
        else:
            # STATE B: Uploaded & verified, but curriculum not built yet
            curriculum_status = "not_built"
            is_curriculum_active = False

        # 7. Resolve processing_status
        if target_version.status == "failed" or target_version.processing_status == "failed":
            processing_status = "failed"
        elif target_version.status == "processing" or target_version.processing_status == "processing":
            processing_status = "processing"
        elif target_version.processing_status == "completed" or is_curriculum_active or draft is not None:
            processing_status = "completed"
        else:
            # Truthful: file uploaded & verified, future curriculum understanding not started
            processing_status = "not_started"

        has_draft = bool(target_version.curriculum_draft)
        draft_id = target_version.curriculum_draft.id if target_version.curriculum_draft else None

        # 8. Resolve RAG supporting-material status
        from app.models.documents import Document, DocumentChunk
        rag_status = "not_indexed"
        if target_version.document_id:
            doc = db.query(Document).filter(Document.id == target_version.document_id).first()
            if doc:
                has_chunks = db.query(DocumentChunk).filter(DocumentChunk.document_id == doc.id).first() is not None
                if doc.processing_stage == "completed" or has_chunks:
                    rag_status = "indexed"
                elif doc.status == "failed" or doc.processing_stage == "failed":
                    rag_status = "failed"
                elif doc.status in ["processing", "queued"] or doc.processing_stage in ["extracting", "chunking"]:
                    rag_status = "processing"

        is_runtime_ready = bool(is_curriculum_active and has_runtime_subjects)

        return SyllabusCanonicalStateResponse(
            has_syllabus=True,
            syllabus_id=active_syllabus.id,
            current_version_id=target_version.id,
            academic_context_id=active_syllabus.academic_context_id or effective_context_id,
            upload_status=upload_status,
            processing_status=processing_status,
            curriculum_status=curriculum_status,
            is_curriculum_active=is_curriculum_active,
            is_runtime_ready=is_runtime_ready,
            rag_status=rag_status,
            title=active_syllabus.title,
            active_version_number=target_version.version_number,
            source_filename=target_version.source_filename,
            file_size_bytes=target_version.file_size_bytes,
            document_role="syllabus",
            has_draft=has_draft,
            draft_id=draft_id,
            updated_at=target_version.updated_at or active_syllabus.updated_at,
        )
