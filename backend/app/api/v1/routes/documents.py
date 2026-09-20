import os
import uuid
import shutil
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, get_db
from app.core.security import AuthenticatedUser
from app.schemas.documents import DocumentRead, DocumentStatusRead, DocumentUploadResponse
from app.services.ingestion.service import DocumentIngestionService
from app.core.logging import logger

router = APIRouter(prefix="/documents", tags=["Academic Materials & Async Ingestion"])

UPLOAD_STORAGE_DIR = os.path.join(os.getcwd(), "data", "uploads")
os.makedirs(UPLOAD_STORAGE_DIR, exist_ok=True)


@router.get("", response_model=List[DocumentRead])
def list_documents(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lists all uploaded study materials belonging strictly to the authenticated student."""
    return DocumentIngestionService.get_user_documents(db, current_user.id)


@router.post("/upload", response_model=DocumentUploadResponse, status_code=status.HTTP_202_ACCEPTED)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    curriculum_id: Optional[str] = Form(None),
    subject_id: Optional[str] = Form(None),
    language: str = Form("en"),
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Asynchronous Document Ingestion Endpoint.
    Stores raw student material securely, creates a tracked document record,
    and dispatches background processing without blocking the HTTP request thread.
    Returns HTTP 202 (Accepted) with job status URL.
    """
    filename = file.filename or f"upload_{uuid.uuid4()}"
    extension = filename.split(".")[-1].lower() if "." in filename else "bin"

    # Validation: File type
    if extension not in DocumentIngestionService.SUPPORTED_EXTENSIONS:
        supported = ", ".join(DocumentIngestionService.SUPPORTED_EXTENSIONS.keys())
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{extension}'. Supported formats: {supported}.",
        )

    # Secure local storage path per student
    user_upload_dir = os.path.join(UPLOAD_STORAGE_DIR, current_user.id)
    os.makedirs(user_upload_dir, exist_ok=True)
    stored_filename = f"{uuid.uuid4()}_{filename}"
    file_path = os.path.join(user_upload_dir, stored_filename)

    # Save uploaded file
    file_size = 0
    try:
        with open(file_path, "wb") as buffer:
            # Stream in chunks to prevent memory spikes
            while chunk := await file.read(1024 * 1024):  # 1MB chunks
                file_size += len(chunk)
                if file_size > DocumentIngestionService.MAX_FILE_SIZE_BYTES:
                    buffer.close()
                    os.remove(file_path)
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail="File exceeds maximum allowed size of 50 MB.",
                    )
                buffer.write(chunk)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to store uploaded file: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to store uploaded file securely.",
        )

    # Create tracked Document record
    document_title = title.strip() if title and title.strip() else filename
    doc = DocumentIngestionService.create_document_record(
        db=db,
        user_id=current_user.id,
        title=document_title,
        filename=filename,
        file_path=file_path,
        file_size=file_size,
        source_type=extension,
        curriculum_id=curriculum_id if curriculum_id and curriculum_id.strip() else None,
        subject_id=subject_id if subject_id and subject_id.strip() else None,
        language=language,
    )

    # Dispatch asynchronous background worker
    background_tasks.add_task(DocumentIngestionService.process_document_job_sync, doc.id)

    return DocumentUploadResponse(
        id=doc.id,
        title=doc.title,
        status=doc.status,
        processing_stage=doc.processing_stage,
        progress_percent=doc.progress_percent,
        message="Document uploaded successfully and queued for background analysis.",
        status_url=f"/api/v1/documents/{doc.id}/status",
    )


@router.get("/{document_id}", response_model=DocumentRead)
def get_document(
    document_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieves document details, enforcing strict student ownership."""
    doc = DocumentIngestionService.get_document_status(db, document_id, current_user.id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material document not found or access denied.",
        )
    return doc


@router.get("/{document_id}/status", response_model=DocumentStatusRead)
def get_document_status(
    document_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Pollable endpoint to retrieve live processing status and progress percentage."""
    doc = DocumentIngestionService.get_document_status(db, document_id, current_user.id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material document not found or access denied.",
        )
    return DocumentStatusRead(
        id=doc.id,
        status=doc.status,
        processing_stage=doc.processing_stage,
        progress_percent=doc.progress_percent,
        error_message=doc.error_message,
        updated_at=doc.updated_at,
    )


@router.delete("/{document_id}")
def delete_document(
    document_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Removes a study material and its extracted chunks, enforcing student ownership."""
    success = DocumentIngestionService.delete_document(db, document_id, current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material document not found or access denied.",
        )
    return {"message": "Material document successfully deleted.", "id": document_id}
