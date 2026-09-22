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

        # Context-matching logic: exact context_id or academic_level match
        context_syllabi = syllabus_query.filter(
            (Syllabus.academic_context_id == effective_context_id) |
            (Syllabus.academic_level == canonical_level)
        ).all()

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
                title=None,
                active_version_number=None,
                source_filename=None,
                file_size_bytes=None,
                document_role="syllabus",
                updated_at=None,
            )

        # Prioritize exact academic_context_id match, then latest updated
        exact_match = next((s for s in context_syllabi if s.academic_context_id == effective_context_id), None)
        active_syllabus: Syllabus = exact_match or sorted(context_syllabi, key=lambda s: s.updated_at, reverse=True)[0]

        # 3. Determine target version (active version takes precedence, then latest version)
        versions = active_syllabus.versions
        active_ver = next((v for v in versions if v.is_active), None)
        latest_ver = max(versions, key=lambda v: v.version_number) if versions else None
        target_version: Optional[SyllabusVersion] = active_ver or latest_ver

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
        # Check active status first
        is_active = bool(target_version.is_active or active_syllabus.status == "active" or target_version.curriculum_status == "active")
        
        if is_active:
            # STATE D: Curriculum active
            curriculum_status = "active"
            is_curriculum_active = True
        elif target_version.curriculum_status in ["draft", "review_required"] or active_syllabus.status in ["confirmed", "extracted"]:
            # STATE C: Interpretation exists, pending review
            curriculum_status = target_version.curriculum_status if target_version.curriculum_status in ["draft", "review_required"] else "review_required"
            is_curriculum_active = False
        elif target_version.curriculum_status == "archived" or active_syllabus.status == "archived":
            curriculum_status = "archived"
            is_curriculum_active = False
        else:
            # STATE B: Uploaded & verified, but curriculum not built yet
            curriculum_status = "not_built"
            is_curriculum_active = False

        # 7. Resolve processing_status
        if target_version.status == "failed":
            processing_status = "failed"
        elif target_version.status == "processing":
            processing_status = "processing"
        elif is_curriculum_active:
            processing_status = "completed"
        else:
            # Truthful: file uploaded & verified, future curriculum understanding not started
            processing_status = "not_started"

        return SyllabusCanonicalStateResponse(
            has_syllabus=True,
            syllabus_id=active_syllabus.id,
            current_version_id=target_version.id,
            academic_context_id=active_syllabus.academic_context_id or effective_context_id,
            upload_status=upload_status,
            processing_status=processing_status,
            curriculum_status=curriculum_status,
            is_curriculum_active=is_curriculum_active,
            title=active_syllabus.title,
            active_version_number=target_version.version_number,
            source_filename=target_version.source_filename,
            file_size_bytes=target_version.file_size_bytes,
            document_role="syllabus",
            updated_at=target_version.updated_at or active_syllabus.updated_at,
        )
