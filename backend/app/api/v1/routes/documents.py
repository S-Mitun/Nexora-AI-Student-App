from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from backend.app.api.dependencies import get_current_user
from backend.app.core.security import AuthenticatedUser

router = APIRouter(prefix="/documents", tags=["Document Harmonization (Stage 06 Prep)"])


@router.get("")
def list_documents(current_user: AuthenticatedUser = Depends(get_current_user)):
    """Extension endpoint for Stage 06: List uploaded study materials."""
    return []


@router.post("/upload")
def upload_document(current_user: AuthenticatedUser = Depends(get_current_user)):
    """Extension endpoint for Stage 06: Ingest student textbook or notes."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Document upload and harmonization pipeline will be activated in Master Prompt 06.",
    )
