from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload

from app.api.dependencies import get_current_user, get_db
from app.core.security import AuthenticatedUser
from app.models.notes import Note
from app.models.learning import Subject, Concept
from app.schemas.notes import NoteCreate, NoteUpdate, NoteRead
from app.services.learning.context_service import AcademicContextResolver

router = APIRouter(prefix="/notes", tags=["Student Notes"])


@router.get("", response_model=List[NoteRead])
def list_notes(
    academic_level: Optional[str] = Query(None, description="Filter by canonical academic level"),
    subject_id: Optional[str] = Query(None, description="Filter by subject ID"),
    concept_id: Optional[str] = Query(None, description="Filter by concept ID"),
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Lists authenticated student's notes strictly scoped to the active academic level.
    Guarantees that notes from one level do not appear in another level's workspace.
    """
    # If academic_level is not provided, resolve student's current active level
    target_level = academic_level
    if not target_level:
        ctx = AcademicContextResolver.resolve_context(db, current_user.id)
        target_level = ctx.academic_level

    query = (
        db.query(Note)
        .options(joinedload(Note.concept))
        .filter(Note.user_id == current_user.id, Note.academic_level == target_level)
    )

    if subject_id:
        query = query.filter(Note.subject_id == subject_id)
    if concept_id:
        query = query.filter(Note.concept_id == concept_id)

    notes = query.order_by(Note.updated_at.desc()).all()

    # Populate subject_name and concept_name
    result = []
    for n in notes:
        read_obj = NoteRead.model_validate(n)
        if n.concept:
            read_obj.concept_name = n.concept.name
        if n.subject_id:
            subj = db.query(Subject).filter(Subject.id == n.subject_id).first()
            if subj:
                read_obj.subject_name = subj.name
        result.append(read_obj)

    return result


@router.post("", response_model=NoteRead, status_code=status.HTTP_201_CREATED)
def create_note(
    payload: NoteCreate,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Creates a new note owned strictly by the authenticated student and scoped to academic level.
    """
    # Default to current active level if not provided
    level = payload.academic_level
    if not level:
        ctx = AcademicContextResolver.resolve_context(db, current_user.id)
        level = ctx.academic_level

    note = Note(
        user_id=current_user.id,
        academic_level=level,
        subject_id=payload.subject_id,
        concept_id=payload.concept_id,
        module_id=payload.module_id,
        lesson_id=payload.lesson_id,
        title=payload.title.strip(),
        content=payload.content.strip(),
        source_reference=payload.source_reference,
        tags=payload.tags or [],
        is_pinned=payload.is_pinned or False,
        is_archived=payload.is_archived or False,
    )
    db.add(note)
    db.commit()
    db.refresh(note)

    read_obj = NoteRead.model_validate(note)
    if note.concept_id:
        c = db.query(Concept).filter(Concept.id == note.concept_id).first()
        if c:
            read_obj.concept_name = c.name
    if note.subject_id:
        s = db.query(Subject).filter(Subject.id == note.subject_id).first()
        if s:
            read_obj.subject_name = s.name

    return read_obj


@router.get("/{note_id}", response_model=NoteRead)
def get_note(
    note_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieves a single note verifying strict student ownership."""
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == current_user.id).first()
    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found or access denied.",
        )

    read_obj = NoteRead.model_validate(note)
    if note.concept_id:
        c = db.query(Concept).filter(Concept.id == note.concept_id).first()
        if c:
            read_obj.concept_name = c.name
    if note.subject_id:
        s = db.query(Subject).filter(Subject.id == note.subject_id).first()
        if s:
            read_obj.subject_name = s.name
    return read_obj


@router.put("/{note_id}", response_model=NoteRead)
def update_note(
    note_id: str,
    payload: NoteUpdate,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Updates an existing note ensuring student ownership."""
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == current_user.id).first()
    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found or access denied.",
        )

    if payload.title is not None:
        note.title = payload.title.strip()
    if payload.content is not None:
        note.content = payload.content.strip()
    if payload.subject_id is not None:
        note.subject_id = payload.subject_id
    if payload.concept_id is not None:
        note.concept_id = payload.concept_id
    if payload.module_id is not None:
        note.module_id = payload.module_id
    if payload.lesson_id is not None:
        note.lesson_id = payload.lesson_id
    if payload.source_reference is not None:
        note.source_reference = payload.source_reference
    if payload.tags is not None:
        note.tags = payload.tags
    if payload.is_pinned is not None:
        note.is_pinned = payload.is_pinned
    if payload.is_archived is not None:
        note.is_archived = payload.is_archived

    db.commit()
    db.refresh(note)

    read_obj = NoteRead.model_validate(note)
    if note.concept_id:
        c = db.query(Concept).filter(Concept.id == note.concept_id).first()
        if c:
            read_obj.concept_name = c.name
    if note.subject_id:
        s = db.query(Subject).filter(Subject.id == note.subject_id).first()
        if s:
            read_obj.subject_name = s.name
    return read_obj


@router.patch("/{note_id}/pin", response_model=NoteRead)
def toggle_pin_note(
    note_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Toggles the pinned status of a student's note."""
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == current_user.id).first()
    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found or access denied.",
        )
    note.is_pinned = not bool(note.is_pinned)
    db.commit()
    db.refresh(note)

    read_obj = NoteRead.model_validate(note)
    if note.concept_id:
        c = db.query(Concept).filter(Concept.id == note.concept_id).first()
        if c:
            read_obj.concept_name = c.name
    if note.subject_id:
        s = db.query(Subject).filter(Subject.id == note.subject_id).first()
        if s:
            read_obj.subject_name = s.name
    return read_obj


@router.delete("/{note_id}", status_code=status.HTTP_200_OK)
def delete_note(
    note_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Deletes an existing note ensuring student ownership."""
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == current_user.id).first()
    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found or access denied.",
        )

    db.delete(note)
    db.commit()
    return {"message": "Note successfully deleted.", "id": note_id}
