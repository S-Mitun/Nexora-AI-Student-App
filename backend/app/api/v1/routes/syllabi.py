import os
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, get_db
from app.core.security import AuthenticatedUser
from app.schemas.syllabus import (
    SyllabusRead,
    SyllabusVersionRead,
    SyllabusUploadResponse,
    SyllabusActivateRequest,
    SyllabusCanonicalStateResponse,
)
from app.services.syllabus.lifecycle_service import SyllabusLifecycleService
from app.services.syllabus.state_resolver import SyllabusStateResolver
from app.core.logging import logger

router = APIRouter(prefix="/syllabi", tags=["Universal Syllabus & Academic Document Lifecycle"])


@router.post("", response_model=SyllabusUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_syllabus(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    academic_context_id: Optional[str] = Form(None),
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Primary Syllabus Upload Endpoint.
    Validates format/size/checksum, stores raw file in isolated student storage,
    creates Syllabus and SyllabusVersion records, and registers the primary document.
    Does NOT generate curriculum entities (those belong to future syllabus-understanding prompts).
    """
    return await SyllabusLifecycleService.upload_primary_syllabus(
        db=db,
        user_id=current_user.id,
        file=file,
        title=title,
        academic_context_id=academic_context_id,
    )


@router.get("/state", response_model=SyllabusCanonicalStateResponse)
def get_syllabus_state(
    academic_context_id: Optional[str] = None,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Authoritative Canonical Syllabus State Endpoint.
    Single full-stack source of truth resolving:
    - has_syllabus
    - upload_status
    - processing_status
    - curriculum_status
    - is_curriculum_active
    Scoped strictly to authenticated student and current authorized academic context.
    """
    return SyllabusStateResolver.resolve_state(
        db=db,
        user_id=current_user.id,
        target_context_id=academic_context_id,
    )


@router.get("", response_model=List[SyllabusRead])
def list_syllabi(
    academic_level: Optional[str] = None,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lists all syllabi and their version summaries belonging strictly to the authenticated student."""
    return SyllabusLifecycleService.get_user_syllabi(
        db=db,
        user_id=current_user.id,
        academic_level=academic_level,
    )


@router.get("/{syllabus_id}", response_model=SyllabusRead)
def get_syllabus(
    syllabus_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieves syllabus details, active version, and version history, enforcing strict ownership."""
    return SyllabusLifecycleService.get_syllabus_by_id(
        db=db,
        user_id=current_user.id,
        syllabus_id=syllabus_id,
    )


@router.get("/{syllabus_id}/versions", response_model=List[SyllabusVersionRead])
def list_syllabus_versions(
    syllabus_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieves version history for a syllabus, enforcing ownership."""
    return SyllabusLifecycleService.get_syllabus_versions(
        db=db,
        user_id=current_user.id,
        syllabus_id=syllabus_id,
    )


@router.get("/{syllabus_id}/versions/{version_id}", response_model=SyllabusVersionRead)
def get_syllabus_version(
    syllabus_id: str,
    version_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieves metadata for a specific syllabus version."""
    version = SyllabusLifecycleService.get_version_by_id(
        db=db,
        user_id=current_user.id,
        syllabus_id=syllabus_id,
        version_id=version_id,
    )
    return SyllabusVersionRead.model_validate(version)


@router.post("/{syllabus_id}/versions", response_model=SyllabusUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_new_syllabus_version(
    syllabus_id: str,
    file: UploadFile = File(...),
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Uploads a new version for an existing syllabus. Preserves historical versions without overwriting."""
    return await SyllabusLifecycleService.upload_new_version(
        db=db,
        user_id=current_user.id,
        syllabus_id=syllabus_id,
        file=file,
    )


@router.patch("/{syllabus_id}/versions/{version_id}/activate", response_model=SyllabusRead)
def activate_syllabus_version(
    syllabus_id: str,
    version_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Sets a specific version as active. Deactivates other versions while preserving history."""
    return SyllabusLifecycleService.activate_version(
        db=db,
        user_id=current_user.id,
        syllabus_id=syllabus_id,
        version_id=version_id,
    )


@router.patch("/{syllabus_id}/versions/{version_id}/archive", response_model=SyllabusVersionRead)
def archive_syllabus_version(
    syllabus_id: str,
    version_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Safely marks a version as archived."""
    return SyllabusLifecycleService.archive_version(
        db=db,
        user_id=current_user.id,
        syllabus_id=syllabus_id,
        version_id=version_id,
    )


@router.get("/{syllabus_id}/versions/{version_id}/download")
def download_syllabus_version_file(
    syllabus_id: str,
    version_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Secure, authenticated file download. Prevents public exposure and verifies student ownership."""
    version = SyllabusLifecycleService.get_version_by_id(
        db=db,
        user_id=current_user.id,
        syllabus_id=syllabus_id,
        version_id=version_id,
    )
    if not version.storage_path or not os.path.exists(version.storage_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stored syllabus file not found.",
        )

    filename = version.source_filename or f"syllabus_v{version.version_number}.pdf"
    media_type = version.mime_type or "application/octet-stream"

    return FileResponse(
        path=version.storage_path,
        filename=filename,
        media_type=media_type,
    )


@router.delete("/{syllabus_id}")
def delete_syllabus(
    syllabus_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Safely removes a syllabus, its versions, documents, and disk files, enforcing ownership."""
    SyllabusLifecycleService.delete_syllabus(
        db=db,
        user_id=current_user.id,
        syllabus_id=syllabus_id,
    )
    return {"message": "Syllabus and its version history successfully deleted.", "id": syllabus_id}
