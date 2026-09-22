import os
import shutil
from typing import Optional, List, Tuple
from datetime import datetime, timezone
from sqlalchemy.orm import Session, joinedload
from fastapi import UploadFile, HTTPException, status

from app.models.syllabus import Syllabus, SyllabusVersion
from app.models.documents import Document
from app.schemas.syllabus import (
    SyllabusRead,
    SyllabusVersionRead,
    SyllabusUploadResponse,
)
from app.services.syllabus.storage_service import SyllabusStorageService
from app.services.learning.context_service import AcademicContextResolver
from app.core.logging import logger


class SyllabusLifecycleService:
    """
    Syllabus Version Lifecycle & Primary Academic Document Management.
    Enforces authenticated ownership, context isolation, deterministic duplicate detection,
    truthful status reporting, and safe version retention.
    """

    @classmethod
    async def upload_primary_syllabus(
        cls,
        db: Session,
        user_id: str,
        file: UploadFile,
        title: Optional[str] = None,
        academic_context_id: Optional[str] = None,
    ) -> SyllabusUploadResponse:
        """
        Universal Syllabus Upload entrypoint.
        Validates file, checks for duplicates via SHA-256 within the student's context,
        creates Syllabus and SyllabusVersion records, and stores the raw document
        with document_role='syllabus' in the primary curriculum pipeline.
        """
        logger.info(f"[SyllabusLifecycle] syllabus_upload_started: user={user_id[:8]} filename={file.filename}")

        # 1. Resolve student's authentic Academic Context
        context = AcademicContextResolver.resolve_context(db, user_id)
        target_context_id = academic_context_id or context.context_id

        # 2. Asynchronously validate and read file bytes
        try:
            content, safe_name, ext, file_size, checksum = (
                await SyllabusStorageService.read_and_validate_file(file)
            )
        except HTTPException:
            logger.warning(f"[SyllabusLifecycle] syllabus_upload_failed: validation error for user={user_id[:8]}")
            raise
        except Exception as e:
            logger.error(f"[SyllabusLifecycle] syllabus_upload_failed: unexpected error: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Unable to process this syllabus. Please try again.",
            )

        # 3. Duplicate Detection via deterministic SHA-256 Checksum within user and context
        existing_version = (
            db.query(SyllabusVersion)
            .join(Syllabus, Syllabus.id == SyllabusVersion.syllabus_id)
            .filter(
                Syllabus.user_id == user_id,
                SyllabusVersion.checksum == checksum,
                (Syllabus.academic_context_id == target_context_id) | (Syllabus.academic_level == context.academic_level),
            )
            .first()
        )

        if existing_version:
            logger.info(
                f"[SyllabusLifecycle] syllabus_upload_duplicate detected: user={user_id[:8]} "
                f"syllabus={existing_version.syllabus_id} version={existing_version.version_number} "
                f"checksum={checksum[:12]}"
            )
            syl = existing_version.syllabus
            return SyllabusUploadResponse(
                syllabus_id=syl.id,
                version_id=existing_version.id,
                document_id=existing_version.document_id or "",
                title=syl.title,
                filename=existing_version.source_filename or safe_name,
                status=existing_version.status,
                version_number=existing_version.version_number,
                checksum=checksum,
                academic_context_id=syl.academic_context_id,
                is_duplicate=True,
                message="Duplicate syllabus detected. This exact syllabus content has already been uploaded.",
            )

        # 4. Resolve or create parent Syllabus record
        # Match syllabus in same context/level
        syllabus = (
            db.query(Syllabus)
            .filter(
                Syllabus.user_id == user_id,
                (Syllabus.academic_context_id == target_context_id) | (Syllabus.academic_level == context.academic_level),
            )
            .order_by(Syllabus.created_at.desc())
            .first()
        )

        syl_title = title.strip() if title and title.strip() else None
        if not syl_title:
            name_no_ext = os.path.splitext(safe_name)[0].replace("_", " ").title()
            syl_title = f"{name_no_ext} Syllabus"

        if not syllabus:
            syllabus = Syllabus(
                user_id=user_id,
                academic_context_id=target_context_id,
                academic_level=context.academic_level,
                institution=context.institution,
                program_degree=context.degree or context.program,
                academic_year=context.academic_year or context.grade_level,
                title=syl_title,
                status="uploaded",
            )
            db.add(syllabus)
            db.flush()
            version_number = 1
        else:
            # Increment version for existing syllabus
            max_ver = max([v.version_number for v in syllabus.versions], default=0)
            version_number = max_ver + 1
            if title and title.strip():
                syllabus.title = title.strip()
            syllabus.status = "uploaded"
            syllabus.updated_at = datetime.now(timezone.utc)

        # 5. Build safe storage path and persist file to disk
        storage_path = SyllabusStorageService.build_version_storage_path(
            user_id=user_id,
            syllabus_id=syllabus.id,
            version_number=version_number,
            safe_filename=safe_name,
        )
        SyllabusStorageService.save_bytes_to_disk(storage_path, content)

        # 6. Create SyllabusVersion record
        version = SyllabusVersion(
            syllabus_id=syllabus.id,
            version_number=version_number,
            status="uploaded",
            upload_status="verified",
            processing_status="not_started",
            curriculum_status="not_built",
            source_filename=safe_name,
            file_size_bytes=file_size,
            mime_type=file.content_type or SyllabusStorageService.SUPPORTED_EXTENSIONS.get(ext, "application/octet-stream"),
            checksum=checksum,
            storage_path=storage_path,
            is_active=False,
        )
        db.add(version)
        db.flush()

        # 7. Create Document record with primary curriculum classification (document_role='syllabus')
        doc = Document(
            user_id=user_id,
            title=syllabus.title,
            source_type=ext,
            file_path=storage_path,
            file_size_bytes=file_size,
            status="uploaded",
            processing_stage="uploaded",
            progress_percent=100,
            syllabus_id=syllabus.id,
            syllabus_version_id=version.id,
            academic_context_id=target_context_id,
            document_role="syllabus",
            mime_type=version.mime_type,
            content_hash=checksum,
            metadata_json={
                "source_filename": safe_name,
                "file_extension": f".{ext}",
                "version_number": version_number,
                "academic_level": context.academic_level,
                "context_id": target_context_id,
                "uploaded_at": datetime.now(timezone.utc).isoformat(),
            },
        )
        db.add(doc)
        db.flush()

        # Link document back to version
        version.document_id = doc.id
        db.commit()
        db.refresh(syllabus)
        db.refresh(version)

        logger.info(
            f"[SyllabusLifecycle] syllabus_upload_completed: user={user_id[:8]} "
            f"syllabus_id={syllabus.id} version_id={version.id} version_number={version_number} "
            f"size={file_size} bytes checksum={checksum[:12]}"
        )

        return SyllabusUploadResponse(
            syllabus_id=syllabus.id,
            version_id=version.id,
            document_id=doc.id,
            title=syllabus.title,
            filename=safe_name,
            status=version.status,
            version_number=version_number,
            checksum=checksum,
            academic_context_id=syllabus.academic_context_id,
            is_duplicate=False,
            message="Syllabus uploaded successfully and classified as Primary Academic Document.",
        )

    @classmethod
    async def upload_new_version(
        cls,
        db: Session,
        user_id: str,
        syllabus_id: str,
        file: UploadFile,
    ) -> SyllabusUploadResponse:
        """Uploads a new version specifically to an existing syllabus belonging to the student."""
        syllabus = (
            db.query(Syllabus)
            .filter(Syllabus.id == syllabus_id, Syllabus.user_id == user_id)
            .first()
        )
        if not syllabus:
            logger.warning(f"[SyllabusLifecycle] Unauthorized/not-found syllabus version upload: {syllabus_id} by {user_id[:8]}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Syllabus not found or access denied.",
            )

        content, safe_name, ext, file_size, checksum = (
            await SyllabusStorageService.read_and_validate_file(file)
        )

        # Check for duplicate checksum within this specific syllabus
        existing_ver = (
            db.query(SyllabusVersion)
            .filter(
                SyllabusVersion.syllabus_id == syllabus_id,
                SyllabusVersion.checksum == checksum,
            )
            .first()
        )
        if existing_ver:
            return SyllabusUploadResponse(
                syllabus_id=syllabus.id,
                version_id=existing_ver.id,
                document_id=existing_ver.document_id or "",
                title=syllabus.title,
                filename=existing_ver.source_filename or safe_name,
                status=existing_ver.status,
                version_number=existing_ver.version_number,
                checksum=checksum,
                academic_context_id=syllabus.academic_context_id,
                is_duplicate=True,
                message="Duplicate version detected. This exact file already exists for this syllabus.",
            )

        max_ver = max([v.version_number for v in syllabus.versions], default=0)
        new_version_num = max_ver + 1

        storage_path = SyllabusStorageService.build_version_storage_path(
            user_id=user_id,
            syllabus_id=syllabus.id,
            version_number=new_version_num,
            safe_filename=safe_name,
        )
        SyllabusStorageService.save_bytes_to_disk(storage_path, content)

        version = SyllabusVersion(
            syllabus_id=syllabus.id,
            version_number=new_version_num,
            status="uploaded",
            upload_status="verified",
            processing_status="not_started",
            curriculum_status="not_built",
            source_filename=safe_name,
            file_size_bytes=file_size,
            mime_type=file.content_type or SyllabusStorageService.SUPPORTED_EXTENSIONS.get(ext, "application/octet-stream"),
            checksum=checksum,
            storage_path=storage_path,
            is_active=False,
        )
        db.add(version)
        db.flush()

        doc = Document(
            user_id=user_id,
            title=f"{syllabus.title} (v{new_version_num})",
            source_type=ext,
            file_path=storage_path,
            file_size_bytes=file_size,
            status="uploaded",
            processing_stage="uploaded",
            progress_percent=100,
            syllabus_id=syllabus.id,
            syllabus_version_id=version.id,
            academic_context_id=syllabus.academic_context_id,
            document_role="syllabus",
            mime_type=version.mime_type,
            content_hash=checksum,
            metadata_json={
                "source_filename": safe_name,
                "file_extension": f".{ext}",
                "version_number": new_version_num,
                "uploaded_at": datetime.now(timezone.utc).isoformat(),
            },
        )
        db.add(doc)
        db.flush()

        version.document_id = doc.id
        syllabus.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(version)

        logger.info(
            f"[SyllabusLifecycle] syllabus_version_created: user={user_id[:8]} "
            f"syllabus_id={syllabus.id} version_id={version.id} v={new_version_num}"
        )

        return SyllabusUploadResponse(
            syllabus_id=syllabus.id,
            version_id=version.id,
            document_id=doc.id,
            title=syllabus.title,
            filename=safe_name,
            status=version.status,
            version_number=new_version_num,
            checksum=checksum,
            academic_context_id=syllabus.academic_context_id,
            is_duplicate=False,
            message=f"Version {new_version_num} uploaded successfully.",
        )

    @classmethod
    def get_user_syllabi(
        cls,
        db: Session,
        user_id: str,
        academic_level: Optional[str] = None,
    ) -> List[SyllabusRead]:
        """Returns all syllabi belonging strictly to the authenticated student."""
        query = (
            db.query(Syllabus)
            .options(joinedload(Syllabus.versions))
            .filter(Syllabus.user_id == user_id)
        )
        if academic_level:
            query = query.filter(Syllabus.academic_level == academic_level)

        syllabi = query.order_by(Syllabus.created_at.desc()).all()
        results = []
        for syl in syllabi:
            active_v = next((v for v in syl.versions if v.is_active), None)
            ver_reads = [SyllabusVersionRead.model_validate(v) for v in syl.versions]
            syl_read = SyllabusRead(
                id=syl.id,
                user_id=syl.user_id,
                title=syl.title,
                academic_level=syl.academic_level,
                academic_context_id=syl.academic_context_id,
                institution=syl.institution,
                program_degree=syl.program_degree,
                academic_year=syl.academic_year,
                status=syl.status,
                created_at=syl.created_at,
                updated_at=syl.updated_at,
                active_version=SyllabusVersionRead.model_validate(active_v) if active_v else None,
                versions=ver_reads,
            )
            results.append(syl_read)
        return results

    @classmethod
    def get_syllabus_by_id(cls, db: Session, user_id: str, syllabus_id: str) -> SyllabusRead:
        """Retrieves a single syllabus, strictly enforcing student ownership."""
        syl = (
            db.query(Syllabus)
            .options(joinedload(Syllabus.versions))
            .filter(Syllabus.id == syllabus_id, Syllabus.user_id == user_id)
            .first()
        )
        if not syl:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Syllabus not found or access denied.",
            )

        active_v = next((v for v in syl.versions if v.is_active), None)
        return SyllabusRead(
            id=syl.id,
            user_id=syl.user_id,
            title=syl.title,
            academic_level=syl.academic_level,
            academic_context_id=syl.academic_context_id,
            institution=syl.institution,
            program_degree=syl.program_degree,
            academic_year=syl.academic_year,
            status=syl.status,
            created_at=syl.created_at,
            updated_at=syl.updated_at,
            active_version=SyllabusVersionRead.model_validate(active_v) if active_v else None,
            versions=[SyllabusVersionRead.model_validate(v) for v in syl.versions],
        )

    @classmethod
    def get_syllabus_versions(cls, db: Session, user_id: str, syllabus_id: str) -> List[SyllabusVersionRead]:
        """Returns version history for a syllabus, enforcing student ownership."""
        syl = (
            db.query(Syllabus)
            .filter(Syllabus.id == syllabus_id, Syllabus.user_id == user_id)
            .first()
        )
        if not syl:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Syllabus not found or access denied.",
            )

        versions = (
            db.query(SyllabusVersion)
            .filter(SyllabusVersion.syllabus_id == syllabus_id)
            .order_by(SyllabusVersion.version_number.desc())
            .all()
        )
        return [SyllabusVersionRead.model_validate(v) for v in versions]

    @classmethod
    def get_version_by_id(
        cls,
        db: Session,
        user_id: str,
        syllabus_id: str,
        version_id: str,
    ) -> SyllabusVersion:
        """Retrieves a single version entity with verified ownership."""
        version = (
            db.query(SyllabusVersion)
            .join(Syllabus, Syllabus.id == SyllabusVersion.syllabus_id)
            .filter(
                SyllabusVersion.id == version_id,
                Syllabus.id == syllabus_id,
                Syllabus.user_id == user_id,
            )
            .first()
        )
        if not version:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Syllabus version not found or access denied.",
            )
        return version

    @classmethod
    def activate_version(
        cls,
        db: Session,
        user_id: str,
        syllabus_id: str,
        version_id: str,
    ) -> SyllabusRead:
        """
        Activates a specific version. Guarantees that exactly one version is active.
        Does not silently delete old versions.
        """
        version = cls.get_version_by_id(db, user_id, syllabus_id, version_id)
        syllabus = db.query(Syllabus).filter(Syllabus.id == syllabus_id).first()

        # Deactivate all sibling versions
        db.query(SyllabusVersion).filter(
            SyllabusVersion.syllabus_id == syllabus_id,
            SyllabusVersion.id != version_id,
        ).update({"is_active": False, "curriculum_status": "not_built"}, synchronize_session="fetch")

        # Activate selected version
        version.is_active = True
        version.status = "active"
        version.curriculum_status = "active"
        version.processing_status = "completed"
        version.activated_at = datetime.now(timezone.utc)
        syllabus.status = "active"
        syllabus.updated_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(syllabus)

        logger.info(
            f"[SyllabusLifecycle] syllabus_version_activated: user={user_id[:8]} "
            f"syllabus_id={syllabus_id} version_id={version_id} v={version.version_number}"
        )
        return cls.get_syllabus_by_id(db, user_id, syllabus_id)

    @classmethod
    def archive_version(
        cls,
        db: Session,
        user_id: str,
        syllabus_id: str,
        version_id: str,
    ) -> SyllabusVersionRead:
        """Safely marks a version as archived without deleting historical record."""
        version = cls.get_version_by_id(db, user_id, syllabus_id, version_id)
        version.status = "archived"
        version.curriculum_status = "archived"
        version.is_active = False

        # If no other version is active, mark syllabus status as archived
        syllabus = db.query(Syllabus).filter(Syllabus.id == syllabus_id).first()
        if syllabus:
            has_other_active = db.query(SyllabusVersion).filter(
                SyllabusVersion.syllabus_id == syllabus_id,
                SyllabusVersion.id != version_id,
                SyllabusVersion.is_active == True,
            ).first() is not None
            if not has_other_active:
                syllabus.status = "archived"
                syllabus.updated_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(version)

        logger.info(
            f"[SyllabusLifecycle] syllabus_version_archived: user={user_id[:8]} "
            f"syllabus_id={syllabus_id} version_id={version_id}"
        )
        return SyllabusVersionRead.model_validate(version)

    @classmethod
    def delete_syllabus(cls, db: Session, user_id: str, syllabus_id: str) -> bool:
        """
        Safely cascades deletion of a syllabus:
        1. Verifies student ownership
        2. Deletes stored files from isolated disk directory
        3. Cascades removal of documents, versions, and syllabus records
        """
        syllabus = (
            db.query(Syllabus)
            .options(joinedload(Syllabus.versions))
            .filter(Syllabus.id == syllabus_id, Syllabus.user_id == user_id)
            .first()
        )
        if not syllabus:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Syllabus not found or access denied.",
            )

        # Delete stored files for all versions
        for v in syllabus.versions:
            SyllabusStorageService.delete_version_file(v.storage_path)

        # Clean syllabus directory if empty
        syl_dir = os.path.join(SyllabusStorageService.get_storage_base_dir(), user_id, syllabus_id)
        if os.path.exists(syl_dir):
            try:
                shutil.rmtree(syl_dir)
            except OSError:
                pass

        # Also remove linked Document records
        db.query(Document).filter(Document.syllabus_id == syllabus_id).delete(synchronize_session="fetch")

        # Delete syllabus (cascades to versions)
        db.delete(syllabus)
        db.commit()

        logger.info(f"[SyllabusLifecycle] syllabus_deleted: user={user_id[:8]} syllabus_id={syllabus_id}")
        return True
