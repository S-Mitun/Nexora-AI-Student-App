from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from backend.app.schemas.chat import ChatSessionRead, ChatMessageCreate, ChatMessageRead
from backend.app.api.dependencies import get_current_user
from backend.app.core.security import AuthenticatedUser

router = APIRouter(prefix="/chat", tags=["AI Tutor & Chat Companion (Stage 06 Prep)"])


@router.get("/sessions", response_model=List[ChatSessionRead])
def list_sessions(current_user: AuthenticatedUser = Depends(get_current_user)):
    """Extension endpoint for Stage 06: List student chat sessions."""
    return []


@router.post("/sessions/{session_id}/messages")
def send_message(session_id: str, message: ChatMessageCreate, current_user: AuthenticatedUser = Depends(get_current_user)):
    """Extension endpoint for Stage 06: RAG-grounded AI companion conversation."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="RAG conversation engine will be activated in Master Prompt 06.",
    )
