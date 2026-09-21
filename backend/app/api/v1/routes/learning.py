import json
from typing import List, Optional, Any, Dict
from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.dependencies import get_optional_user, get_current_user
from app.core.security import AuthenticatedUser
from app.models.learning import Curriculum, Subject, Topic, Concept, LearningModule, Lesson
from app.models.profile import UserProfile
from app.schemas.learning import (
    CurriculumRead,
    SubjectRead,
    SubjectDetail,
    TopicRead,
    TopicDetail,
    ConceptRead,
    ConceptDetail,
    LearningModuleRead,
    LearningModuleSummary,
    LearningModuleDetail,
    LessonRead,
    LessonDetailRead,
    ConceptExploreRequest,
    ConceptExploreResponse,
)
from app.services.learning.curriculum_service import CurriculumService
from app.services.learning.concept_service import ConceptService
from app.services.learning.context_service import AcademicContextResolver
from app.services.learning.personalization_service import (
    PersonalizationService,
    RecommendedTopic,
    PersonalizedContext,
)
from app.core.logging import logger

router = APIRouter(prefix="/learning", tags=["Learning Engine & Curriculum"])


# ==============================================================================
# LEVEL 0 — CURRICULA & EDUCATIONAL BOARDS
# ==============================================================================

@router.get("/curricula", response_model=List[CurriculumRead])
def list_curricula(
    education_level: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    Returns supported academic curricula and boards (e.g., CBSE, ICSE, State Board, University).
    Decouples curriculum from fixed engineering/computer science assumptions.
    """
    query = db.query(Curriculum).filter(Curriculum.is_active == True)
    if education_level:
        query = query.filter(Curriculum.education_level == education_level)
    return query.order_by(Curriculum.name.asc()).all()


def _verify_subject_access(
    db: Session,
    subject: Optional[Subject],
    current_user: Optional[AuthenticatedUser],
    include_reference: bool = False,
) -> None:
    """
    Enforces Rule 2 & 3:
    Legacy/default/demo curriculum is quarantined and MUST NOT be reachable from normal runtime.
    Unless explicitly migrated into an active syllabus version, access is denied (404 Not Found).
    Reference templates are only accessible when include_reference is explicitly True.
    """
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Requested curriculum entity not found.",
        )

    if include_reference:
        return

    # Quarantined system reference templates / subjects without active syllabus version return 404
    if getattr(subject, "is_system", False) or not subject.syllabus_version_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Curriculum content is not part of an active syllabus.",
        )

    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Curriculum content not found for current session.",
        )

    from app.models.syllabus import Syllabus, SyllabusVersion
    is_authorized = (
        db.query(SyllabusVersion)
        .join(Syllabus, SyllabusVersion.syllabus_id == Syllabus.id)
        .filter(
            Syllabus.user_id == current_user.id,
            Syllabus.status.in_(["confirmed", "extracted"]),
            SyllabusVersion.id == subject.syllabus_version_id,
            SyllabusVersion.is_active == True,
        )
        .first()
        is not None
    )

    if not is_authorized:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Curriculum content is not part of your active syllabus.",
        )


# ==============================================================================
# LEVEL 1 — SUBJECT ENDPOINTS
# ==============================================================================

@router.get("/subjects", response_model=List[SubjectRead])
def list_subjects(
    curriculum_id: Optional[str] = None,
    education_level: Optional[str] = None,
    include_reference: bool = False,
    current_user: Optional[AuthenticatedUser] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """
    Returns active academic subjects matching the authoritative syllabus context.
    If no active syllabus is confirmed for the user and include_reference is False, returns [].
    """
    target_level = education_level
    enrolled_ids = set()
    user_id = current_user.id if current_user else None
    active_version_id = None

    if current_user:
        from app.models.syllabus import Syllabus, SyllabusVersion
        from app.services.learning.context_service import AcademicContextResolver
        ctx = AcademicContextResolver.resolve_context(db, current_user.id)
        if not target_level:
            target_level = ctx.academic_level
        enrolled_ids = set(ctx.enrolled_subject_ids)

        active_syl = (
            db.query(Syllabus)
            .filter(
                Syllabus.user_id == current_user.id,
                Syllabus.academic_level == target_level,
                Syllabus.status.in_(["confirmed", "extracted"]),
            )
            .first()
        )
        if active_syl:
            active_ver = (
                db.query(SyllabusVersion)
                .filter(
                    SyllabusVersion.syllabus_id == active_syl.id,
                    SyllabusVersion.is_active == True,
                )
                .first()
            )
            if active_ver:
                active_version_id = active_ver.id

    subjects = CurriculumService.get_subjects(
        db,
        curriculum_id=curriculum_id,
        education_level=target_level,
        user_id=user_id if active_version_id else None,
        syllabus_version_id=active_version_id,
        include_reference=include_reference,
    )

    results = []
    for sub in subjects:
        total_concepts = sum(len(top.concepts) for top in sub.topics)
        results.append(
            SubjectRead(
                id=sub.id,
                curriculum_id=sub.curriculum_id,
                name=sub.name,
                slug=sub.slug,
                description=sub.description,
                icon=sub.icon,
                category=sub.category,
                difficulty_level=sub.difficulty_level,
                education_level=getattr(sub, "education_level", "all-levels") or "all-levels",
                academic_domain=getattr(sub, "academic_domain", "General") or "General",
                is_system=getattr(sub, "is_system", True),
                is_enrolled=sub.id in enrolled_ids,
                order_index=sub.order_index,
                is_active=sub.is_active,
                topic_count=len(sub.topics),
                concept_count=total_concepts,
            )
        )
    return results


@router.get("/subjects/{subject_identifier}", response_model=SubjectDetail)
def get_subject_detail(
    subject_identifier: str,
    include_reference: bool = Query(False),
    current_user: Optional[AuthenticatedUser] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """
    Retrieves full details for a subject by UUID or unique slug,
    including its syllabus topics and nested concepts.
    """
    sub = CurriculumService.get_subject(db, subject_identifier)
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Subject '{subject_identifier}' not found in curriculum.",
        )

    _verify_subject_access(db, sub, current_user, include_reference=include_reference)

    topic_details = []
    for top in sub.topics:
        concept_reads = [
            ConceptRead(
                id=con.id,
                topic_id=con.topic_id,
                name=con.name,
                slug=con.slug,
                summary=con.summary,
                short_description=con.short_description,
                difficulty=con.difficulty,
                difficulty_level=con.difficulty_level,
                order_index=con.order_index,
                is_active=con.is_active,
                module_count=len(con.learning_modules),
            )
            for con in top.concepts
            if con.is_active
        ]
        topic_details.append(
            TopicDetail(
                id=top.id,
                subject_id=top.subject_id,
                name=top.name,
                slug=top.slug,
                description=top.description,
                order_index=top.order_index,
                is_active=top.is_active,
                concept_count=len(concept_reads),
                concepts=concept_reads,
                subject_name=sub.name,
                subject_slug=sub.slug,
            )
        )

    total_concepts = sum(td.concept_count for td in topic_details)

    return SubjectDetail(
        id=sub.id,
        name=sub.name,
        slug=sub.slug,
        description=sub.description,
        icon=sub.icon,
        category=sub.category,
        difficulty_level=sub.difficulty_level,
        order_index=sub.order_index,
        is_active=sub.is_active,
        topic_count=len(topic_details),
        concept_count=total_concepts,
        topics=topic_details,
    )


@router.get("/subjects/{subject_identifier}/topics", response_model=List[TopicRead])
def list_subject_topics(
    subject_identifier: str,
    include_reference: bool = Query(False),
    current_user: Optional[AuthenticatedUser] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """Returns all topics belonging to a specific subject."""
    sub = CurriculumService.get_subject(db, subject_identifier)
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Subject '{subject_identifier}' not found.",
        )
    _verify_subject_access(db, sub, current_user, include_reference=include_reference)

    topics = CurriculumService.get_topics_for_subject(db, subject_identifier)
    results = []
    for top in topics:
        results.append(
            TopicRead(
                id=top.id,
                subject_id=top.subject_id,
                name=top.name,
                slug=top.slug,
                description=top.description,
                order_index=top.order_index,
                is_active=top.is_active,
                concept_count=len(top.concepts),
            )
        )
    return results


# ==============================================================================
# LEVEL 2 — TOPIC ENDPOINTS
# ==============================================================================

@router.get("/topics/{topic_identifier}", response_model=TopicDetail)
def get_topic_detail(
    topic_identifier: str,
    include_reference: bool = Query(False),
    current_user: Optional[AuthenticatedUser] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """Retrieves full topic details including nested concepts."""
    top = CurriculumService.get_topic(db, topic_identifier)
    if not top:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Topic '{topic_identifier}' not found in curriculum.",
        )

    _verify_subject_access(db, top.subject, current_user, include_reference=include_reference)

    concept_reads = [
        ConceptRead(
            id=con.id,
            topic_id=con.topic_id,
            name=con.name,
            slug=con.slug,
            summary=con.summary,
            short_description=con.short_description,
            difficulty=con.difficulty,
            difficulty_level=con.difficulty_level,
            order_index=con.order_index,
            is_active=con.is_active,
            module_count=len(con.learning_modules),
        )
        for con in top.concepts
        if con.is_active
    ]

    return TopicDetail(
        id=top.id,
        subject_id=top.subject_id,
        name=top.name,
        slug=top.slug,
        description=top.description,
        order_index=top.order_index,
        is_active=top.is_active,
        concept_count=len(concept_reads),
        concepts=concept_reads,
        subject_name=top.subject.name if top.subject else None,
        subject_slug=top.subject.slug if top.subject else None,
    )


@router.get("/topics/{topic_identifier}/concepts", response_model=List[ConceptRead])
def list_topic_concepts(
    topic_identifier: str,
    include_reference: bool = Query(False),
    current_user: Optional[AuthenticatedUser] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """Returns all concepts belonging to a specific topic."""
    top = CurriculumService.get_topic(db, topic_identifier)
    if not top:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Topic '{topic_identifier}' not found.",
        )

    _verify_subject_access(db, top.subject, current_user, include_reference=include_reference)
    concepts = CurriculumService.get_concepts_for_topic(db, topic_identifier)

    return [
        ConceptRead(
            id=con.id,
            topic_id=con.topic_id,
            name=con.name,
            slug=con.slug,
            summary=con.summary,
            short_description=con.short_description,
            difficulty=con.difficulty,
            difficulty_level=con.difficulty_level,
            order_index=con.order_index,
            is_active=con.is_active,
            module_count=len(con.learning_modules),
        )
        for con in concepts
        if con.is_active
    ]


# ==============================================================================
# LEVEL 3 — CONCEPT ENDPOINTS
# ==============================================================================

@router.get("/concepts", response_model=List[ConceptRead])
def list_concepts(
    education_level: Optional[str] = Query(None),
    include_reference: bool = Query(False),
    current_user: Optional[AuthenticatedUser] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """
    Returns active concepts matching the authoritative syllabus context.
    If no active syllabus is confirmed for the user and include_reference is False, returns [].
    """
    target_level = education_level
    active_version_id = None
    if current_user:
        ctx = AcademicContextResolver.resolve_context(db, current_user.id)
        if not target_level:
            target_level = ctx.academic_level
        from app.models.syllabus import Syllabus, SyllabusVersion
        active_syl = (
            db.query(Syllabus)
            .filter(
                Syllabus.user_id == current_user.id,
                Syllabus.academic_level == target_level,
                Syllabus.status.in_(["confirmed", "extracted"]),
            )
            .first()
        )
        if active_syl:
            active_ver = (
                db.query(SyllabusVersion)
                .filter(SyllabusVersion.syllabus_id == active_syl.id, SyllabusVersion.is_active == True)
                .first()
            )
            if active_ver:
                active_version_id = active_ver.id

    if not active_version_id and not include_reference:
        return []

    query = db.query(Concept).filter(Concept.is_active == True)
    if active_version_id:
        query = (
            query.join(Topic, Concept.topic_id == Topic.id)
            .join(Subject, Topic.subject_id == Subject.id)
            .filter(Subject.syllabus_version_id == active_version_id)
        )
    elif include_reference:
        query = (
            query.join(Topic, Concept.topic_id == Topic.id)
            .join(Subject, Topic.subject_id == Subject.id)
            .filter(Subject.is_system == True)
        )

    concepts = query.order_by(Concept.order_index.asc()).all()
    return [
        ConceptRead(
            id=con.id,
            topic_id=con.topic_id,
            name=con.name,
            slug=con.slug,
            summary=con.summary,
            short_description=con.short_description,
            difficulty=con.difficulty,
            difficulty_level=con.difficulty_level,
            order_index=con.order_index,
            is_active=con.is_active,
            module_count=len(con.learning_modules),
        )
        for con in concepts
    ]


@router.get("/concepts/{concept_identifier}", response_model=ConceptDetail)
def get_concept_detail(
    concept_identifier: str,
    include_reference: bool = Query(False),
    current_user: Optional[AuthenticatedUser] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """Retrieves full concept details including its structured learning modules."""
    con = CurriculumService.get_concept(db, concept_identifier)
    if not con:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Concept '{concept_identifier}' not found in curriculum.",
        )

    root_sub = con.topic.subject if con.topic and con.topic.subject else None
    _verify_subject_access(db, root_sub, current_user, include_reference=include_reference)

    modules = [
        LearningModuleSummary(
            id=m.id,
            concept_id=m.concept_id,
            title=m.title,
            slug=m.slug or m.id,
            description=m.description,
            learning_objective=m.learning_objective,
            difficulty_level=m.difficulty_level,
            estimated_minutes=m.estimated_minutes,
            order_index=m.order_index,
            lesson_count=len(m.lessons),
            prerequisites=m.prerequisites if isinstance(m.prerequisites, list) else [],
        )
        for m in con.learning_modules
        if m.is_active
    ]

    topic_name = con.topic.name if con.topic else None
    topic_slug = con.topic.slug if con.topic else None
    subject_name = con.topic.subject.name if con.topic and con.topic.subject else None
    subject_slug = con.topic.subject.slug if con.topic and con.topic.subject else None

    return ConceptDetail(
        id=con.id,
        topic_id=con.topic_id,
        name=con.name,
        slug=con.slug,
        summary=con.summary,
        short_description=con.short_description,
        difficulty=con.difficulty,
        difficulty_level=con.difficulty_level,
        order_index=con.order_index,
        is_active=con.is_active,
        module_count=len(modules),
        modules=modules,
        topic_name=topic_name,
        topic_slug=topic_slug,
        subject_name=subject_name,
        subject_slug=subject_slug,
    )


@router.get("/concepts/{concept_identifier}/modules", response_model=List[LearningModuleSummary])
def list_concept_modules(
    concept_identifier: str,
    include_reference: bool = Query(False),
    current_user: Optional[AuthenticatedUser] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """Returns all learning modules for a concept."""
    con = CurriculumService.get_concept(db, concept_identifier)
    if not con:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Concept '{concept_identifier}' not found.",
        )

    root_sub = con.topic.subject if con.topic and con.topic.subject else None
    _verify_subject_access(db, root_sub, current_user, include_reference=include_reference)

    modules = CurriculumService.get_modules_for_concept(db, concept_identifier)
    return [
        LearningModuleSummary(
            id=m.id,
            concept_id=m.concept_id,
            title=m.title,
            slug=m.slug or m.id,
            description=m.description,
            learning_objective=m.learning_objective,
            difficulty_level=m.difficulty_level,
            estimated_minutes=m.estimated_minutes,
            order_index=m.order_index,
            lesson_count=len(m.lessons),
            prerequisites=m.prerequisites if isinstance(m.prerequisites, list) else [],
        )
        for m in modules
        if m.is_active
    ]


# ==============================================================================
# LEVEL 4 — LEARNING MODULE ENDPOINTS
# ==============================================================================

@router.get("/modules", response_model=List[LearningModuleSummary])
def list_learning_modules(
    education_level: Optional[str] = Query(None),
    include_reference: bool = Query(False),
    current_user: Optional[AuthenticatedUser] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """
    Returns active learning modules matching the authoritative syllabus context.
    If no active syllabus is confirmed for the user and include_reference is False, returns [].
    """
    target_level = education_level
    active_version_id = None
    if current_user:
        ctx = AcademicContextResolver.resolve_context(db, current_user.id)
        if not target_level:
            target_level = ctx.academic_level
        from app.models.syllabus import Syllabus, SyllabusVersion
        active_syl = (
            db.query(Syllabus)
            .filter(
                Syllabus.user_id == current_user.id,
                Syllabus.academic_level == target_level,
                Syllabus.status.in_(["confirmed", "extracted"]),
            )
            .first()
        )
        if active_syl:
            active_ver = (
                db.query(SyllabusVersion)
                .filter(SyllabusVersion.syllabus_id == active_syl.id, SyllabusVersion.is_active == True)
                .first()
            )
            if active_ver:
                active_version_id = active_ver.id

    if not active_version_id and not include_reference:
        return []

    query = db.query(LearningModule).filter(LearningModule.is_active == True)
    if active_version_id:
        query = (
            query.join(Concept, LearningModule.concept_id == Concept.id)
            .join(Topic, Concept.topic_id == Topic.id)
            .join(Subject, Topic.subject_id == Subject.id)
            .filter(Subject.syllabus_version_id == active_version_id)
        )
    elif include_reference:
        query = (
            query.join(Concept, LearningModule.concept_id == Concept.id)
            .join(Topic, Concept.topic_id == Topic.id)
            .join(Subject, Topic.subject_id == Subject.id)
            .filter(Subject.is_system == True)
        )

    mods = query.order_by(LearningModule.order_index.asc()).all()
    return [
        LearningModuleSummary(
            id=m.id,
            concept_id=m.concept_id,
            title=m.title,
            slug=m.slug or m.id,
            description=m.description,
            learning_objective=m.learning_objective,
            difficulty_level=m.difficulty_level,
            estimated_minutes=m.estimated_minutes,
            order_index=m.order_index,
            lesson_count=len(m.lessons),
            prerequisites=m.prerequisites if isinstance(m.prerequisites, list) else [],
        )
        for m in mods
    ]


@router.get("/modules/{module_identifier}", response_model=LearningModuleDetail)
def get_module_detail(
    module_identifier: str,
    include_reference: bool = Query(False),
    current_user: Optional[AuthenticatedUser] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """Retrieves full learning module detail with syllabus lessons and parent breadcrumbs."""
    mod = CurriculumService.get_module(db, module_identifier)
    if not mod:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Learning module '{module_identifier}' not found.",
        )

    root_sub = mod.concept.topic.subject if mod.concept and mod.concept.topic and mod.concept.topic.subject else None
    _verify_subject_access(db, root_sub, current_user, include_reference=include_reference)

    lessons = [
        LessonRead(
            id=les.id,
            module_id=les.module_id,
            title=les.title,
            slug=les.slug,
            content_type=les.content_type,
            order_index=les.order_index,
            estimated_minutes=les.estimated_minutes,
            is_active=les.is_active,
        )
        for les in mod.lessons
        if les.is_active
    ]

    concept = mod.concept
    topic = concept.topic if concept else None
    subject = topic.subject if topic else None

    return LearningModuleDetail(
        id=mod.id,
        concept_id=mod.concept_id,
        title=mod.title,
        slug=mod.slug or mod.id,
        description=mod.description,
        learning_objective=mod.learning_objective,
        difficulty_level=mod.difficulty_level,
        estimated_minutes=mod.estimated_minutes,
        order_index=mod.order_index,
        is_active=mod.is_active,
        why_it_matters=mod.why_it_matters,
        simple_explanation=mod.simple_explanation,
        technical_explanation=mod.technical_explanation,
        visualization_type=mod.visualization_type,
        experiment_type=mod.experiment_type,
        simulation_config=mod.simulation_config if isinstance(mod.simulation_config, dict) else {},
        application_notes=mod.application_notes,
        prerequisites=mod.prerequisites if isinstance(mod.prerequisites, list) else [],
        lessons=lessons,
        concept_name=concept.name if concept else None,
        concept_slug=concept.slug if concept else None,
        subject_name=subject.name if subject else None,
        subject_slug=subject.slug if subject else None,
    )


@router.get("/modules/{module_identifier}/lessons", response_model=List[LessonRead])
def list_module_lessons(
    module_identifier: str,
    include_reference: bool = Query(False),
    current_user: Optional[AuthenticatedUser] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """Returns all lessons belonging to a learning module."""
    mod = CurriculumService.get_module(db, module_identifier)
    if not mod:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Learning module '{module_identifier}' not found.",
        )

    root_sub = mod.concept.topic.subject if mod.concept and mod.concept.topic and mod.concept.topic.subject else None
    _verify_subject_access(db, root_sub, current_user, include_reference=include_reference)

    lessons = CurriculumService.get_lessons_for_module(db, module_identifier)
    return [
        LessonRead(
            id=les.id,
            module_id=les.module_id,
            title=les.title,
            slug=les.slug,
            content_type=les.content_type,
            order_index=les.order_index,
            estimated_minutes=les.estimated_minutes,
            is_active=les.is_active,
        )
        for les in lessons
        if les.is_active
    ]


# ==============================================================================
# LEVEL 5 — LESSON / CONTENT ENDPOINTS
# ==============================================================================

@router.get("/lessons", response_model=List[LessonRead])
def list_lessons(
    education_level: Optional[str] = Query(None),
    include_reference: bool = Query(False),
    current_user: Optional[AuthenticatedUser] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """
    Returns active lessons matching the authoritative syllabus context.
    If no active syllabus is confirmed for the user and include_reference is False, returns [].
    """
    target_level = education_level
    active_version_id = None
    if current_user:
        ctx = AcademicContextResolver.resolve_context(db, current_user.id)
        if not target_level:
            target_level = ctx.academic_level
        from app.models.syllabus import Syllabus, SyllabusVersion
        active_syl = (
            db.query(Syllabus)
            .filter(
                Syllabus.user_id == current_user.id,
                Syllabus.academic_level == target_level,
                Syllabus.status.in_(["confirmed", "extracted"]),
            )
            .first()
        )
        if active_syl:
            active_ver = (
                db.query(SyllabusVersion)
                .filter(SyllabusVersion.syllabus_id == active_syl.id, SyllabusVersion.is_active == True)
                .first()
            )
            if active_ver:
                active_version_id = active_ver.id

    if not active_version_id and not include_reference:
        return []

    query = db.query(Lesson).filter(Lesson.is_active == True)
    if active_version_id:
        query = (
            query.join(LearningModule, Lesson.module_id == LearningModule.id)
            .join(Concept, LearningModule.concept_id == Concept.id)
            .join(Topic, Concept.topic_id == Topic.id)
            .join(Subject, Topic.subject_id == Subject.id)
            .filter(Subject.syllabus_version_id == active_version_id)
        )
    elif include_reference:
        query = (
            query.join(LearningModule, Lesson.module_id == LearningModule.id)
            .join(Concept, LearningModule.concept_id == Concept.id)
            .join(Topic, Concept.topic_id == Topic.id)
            .join(Subject, Topic.subject_id == Subject.id)
            .filter(Subject.is_system == True)
        )

    lessons = query.order_by(Lesson.order_index.asc()).all()
    return [
        LessonRead(
            id=les.id,
            module_id=les.module_id,
            title=les.title,
            slug=les.slug,
            content_type=les.content_type,
            order_index=les.order_index,
            estimated_minutes=les.estimated_minutes,
            is_active=les.is_active,
        )
        for les in lessons
    ]


@router.get("/lessons/{lesson_identifier}", response_model=LessonDetailRead)
def get_lesson_detail(
    lesson_identifier: str,
    include_reference: bool = Query(False),
    current_user: Optional[AuthenticatedUser] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """
    Retrieves full lesson content, breadcrumb context, and previous/next navigation pointers.
    Integrates with Prompt 04 to contextualize examples using student profile interests.
    """
    lookup = CurriculumService.get_lesson(db, lesson_identifier)
    if not lookup:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lesson '{lesson_identifier}' not found in curriculum.",
        )

    lesson, prev_lesson, next_lesson = lookup
    module = lesson.learning_module
    concept = module.concept if module else None
    topic = concept.topic if concept else None
    subject = topic.subject if topic else None

    _verify_subject_access(db, subject, current_user, include_reference=include_reference)

    # Prompt 04 Personalization Integration:
    # If the student has selected interests in their profile, attach a personalized perspective
    personalized_context = None
    if current_user and concept:
        profile = db.query(UserProfile).filter(UserProfile.id == current_user.id).first()
        if profile and profile.interests:
            try:
                interests = json.loads(profile.interests) if isinstance(profile.interests, str) else profile.interests
            except Exception:
                interests = [i.strip() for i in str(profile.interests).split(",") if i.strip()]

            if interests:
                p_ctx = PersonalizationService.get_personalized_context(
                    concept=concept.name,
                    interests=interests,
                )
                if p_ctx:
                    personalized_context = p_ctx.model_dump()

    return LessonDetailRead(
        id=lesson.id,
        module_id=lesson.module_id,
        title=lesson.title,
        slug=lesson.slug,
        content_type=lesson.content_type,
        order_index=lesson.order_index,
        estimated_minutes=lesson.estimated_minutes,
        is_active=lesson.is_active,
        content=lesson.content,
        module_title=module.title if module else None,
        concept_name=concept.name if concept else None,
        concept_slug=concept.slug if concept else None,
        subject_name=subject.name if subject else None,
        subject_slug=subject.slug if subject else None,
        previous_lesson_slug=prev_lesson.slug if prev_lesson else None,
        next_lesson_slug=next_lesson.slug if next_lesson else None,
        personalized_context=personalized_context,
    )


# ==============================================================================
# EXPERIENTIAL BLUEPRINT & PERSONALIZATION (PROMPTS 01-04)
# ==============================================================================

@router.post("/explore", response_model=ConceptExploreResponse)
async def explore_concept(
    payload: ConceptExploreRequest,
    current_user: Optional[AuthenticatedUser] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """
    Decomposes a student's question or concept into NEXORA's experiential blueprint:
    DISCOVER -> WHY? -> UNDERSTAND -> VISUALIZE -> EXPERIMENT -> APPLY.
    Contextually personalizes motivation and real-world applications using the student's
    active profile interests or explicit interest hints while keeping academic math invariant.
    """
    try:
        student_interests = []
        if current_user:
            profile = db.query(UserProfile).filter(UserProfile.id == current_user.id).first()
            if profile and profile.interests:
                try:
                    student_interests = json.loads(profile.interests)
                except Exception:
                    student_interests = [i.strip() for i in profile.interests.split(",") if i.strip()]

        result = await ConceptService.explore_concept(
            query=payload.query,
            subject_hint=payload.subject_hint,
            student_interests=student_interests,
            interest_hint=payload.interest_hint,
        )
        return result
    except KeyError as ke:
        logger.warning(f"Concept '{payload.query}' not found in active syllabus curriculum: {str(ke)}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Concept '{payload.query}' not found in active syllabus curriculum and no grounded learning content exists.",
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error decomposing concept '{payload.query}': {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to decompose concept into experiential blueprint.",
        )


@router.get("/recommendations", response_model=List[RecommendedTopic])
def get_recommendations(
    current_user: Optional[AuthenticatedUser] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """
    Returns curated, interest-relatable topic recommendations for the student dashboard.
    Strictly scoped to active syllabus: returns [] if no active syllabus exists.
    """
    if not current_user:
        return []

    from app.models.syllabus import Syllabus
    active_syl = (
        db.query(Syllabus)
        .filter(
            Syllabus.user_id == current_user.id,
            Syllabus.status.in_(["confirmed", "extracted"]),
        )
        .first()
    )
    if not active_syl:
        return []

    student_interests = []
    favorite_subjects = []

    profile = db.query(UserProfile).filter(UserProfile.id == current_user.id).first()
    if profile:
        if profile.interests:
            try:
                student_interests = json.loads(profile.interests)
            except Exception:
                student_interests = [i.strip() for i in profile.interests.split(",") if i.strip()]
        if getattr(profile, "favorite_subjects", None):
            try:
                favorite_subjects = json.loads(profile.favorite_subjects)
            except Exception:
                favorite_subjects = [s.strip() for s in profile.favorite_subjects.split(",") if s.strip()]

        education_category = getattr(profile, "education_category", None) or getattr(profile, "education_level", None)
    else:
        education_category = None

    return PersonalizationService.get_recommended_topics(
        student_interests=student_interests,
        favorite_subjects=favorite_subjects,
        education_category=education_category,
    )


@router.get("/perspectives/{concept_slug}", response_model=List[PersonalizedContext])
def get_perspectives(concept_slug: str):
    """
    Retrieves all available interest-relatable perspectives for a specific concept,
    allowing students to toggle between Gaming, Cricket, Cars, Music, and Space perspectives.
    """
    clean_slug = concept_slug.replace("-", " ")
    return PersonalizationService.get_all_perspectives_for_concept(clean_slug)


@router.get("/simulations", response_model=List[Any])
def list_simulations(
    education_level: Optional[str] = Query(None),
    include_reference: bool = Query(False),
    current_user: Optional[AuthenticatedUser] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """
    Returns simulations tied to the student's active syllabus concepts.
    Returns [] when no active syllabus exists.
    """
    if not include_reference:
        if not current_user:
            return []
        from app.models.syllabus import Syllabus
        ctx = AcademicContextResolver.resolve_context(db, current_user.id)
        target_level = education_level or ctx.academic_level
        active_syl = (
            db.query(Syllabus)
            .filter(
                Syllabus.user_id == current_user.id,
                Syllabus.academic_level == target_level,
                Syllabus.status.in_(["confirmed", "extracted"]),
            )
            .first()
        )
        if not active_syl:
            return []
    return []


@router.get("/practice/sets", response_model=List[Any])
def list_practice_sets(
    academic_level: Optional[str] = Query(None),
    subject_id: Optional[str] = Query(None),
    concept_id: Optional[str] = Query(None),
    lesson_id: Optional[str] = Query(None),
    include_reference: bool = Query(False),
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: Optional[AuthenticatedUser] = Depends(get_optional_user),
):
    """
    Retrieves practice sets calibrated to the student's active academic context.
    Returns honest empty array if no practice sets exist for the queried level/concept.
    """
    from app.models.learning import PracticeSet, PracticeQuestion
    from app.schemas.practice import PracticeSetRead, PracticeQuestionRead

    target_level = academic_level
    if not target_level and current_user:
        ctx = AcademicContextResolver.resolve_context(db, current_user.id)
        target_level = ctx.academic_level
    elif not target_level:
        return []

    # Before an active syllabus exists, return empty unless include_reference=True
    if not include_reference:
        if not current_user:
            return []
        from app.models.syllabus import Syllabus
        active_syl = (
            db.query(Syllabus)
            .filter(
                Syllabus.user_id == current_user.id,
                Syllabus.academic_level == target_level,
                Syllabus.status.in_(["confirmed", "extracted"]),
            )
            .first()
        )
        if not active_syl:
            return []

    # Normalize tier (e.g. class-1-5 -> class_1_5)
    normalized_level = target_level.replace("-", "_")

    query = db.query(PracticeSet).filter(
        PracticeSet.academic_level.in_([target_level, normalized_level]),
        PracticeSet.is_active == True,
    )

    if subject_id:
        query = query.filter(PracticeSet.subject_id == subject_id)
    if concept_id:
        query = query.filter(PracticeSet.concept_id == concept_id)
    if lesson_id:
        query = query.filter(PracticeSet.lesson_id == lesson_id)

    sets = query.limit(limit).all()
    results = []
    for ps in sets:
        read_obj = PracticeSetRead(
            id=ps.id,
            lesson_id=ps.lesson_id,
            concept_id=ps.concept_id,
            module_id=ps.module_id,
            subject_id=ps.subject_id,
            subject_name=ps.learning_module.concept.topic.subject.name if ps.learning_module and ps.learning_module.concept and ps.learning_module.concept.topic and ps.learning_module.concept.topic.subject else None,
            academic_level=ps.academic_level,
            title=ps.title,
            description=ps.description,
            difficulty=ps.difficulty,
            questions_count=len(ps.questions),
            questions=[
                PracticeQuestionRead(
                    id=q.id,
                    practice_set_id=q.practice_set_id,
                    lesson_id=q.lesson_id,
                    concept_id=q.concept_id,
                    question_text=q.question_text,
                    question_type=q.question_type,
                    options=q.options,
                    correct_index=None,  # Hidden before submission
                    explanation=None,
                    difficulty=q.difficulty,
                    points=q.points,
                    order_index=q.order_index,
                )
                for q in ps.questions
            ],
        )
        results.append(read_obj)
    return results


@router.get("/practice/sets/{set_id}", response_model=Any)
def get_practice_set(
    set_id: str,
    db: Session = Depends(get_db),
):
    """
    Retrieves a single practice set with question bank.
    """
    from app.models.learning import PracticeSet
    from app.schemas.practice import PracticeSetRead, PracticeQuestionRead

    ps = db.query(PracticeSet).filter(PracticeSet.id == set_id, PracticeSet.is_active == True).first()
    if not ps:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Practice set not found.",
        )

    return PracticeSetRead(
        id=ps.id,
        lesson_id=ps.lesson_id,
        concept_id=ps.concept_id,
        module_id=ps.module_id,
        subject_id=ps.subject_id,
        subject_name=ps.learning_module.concept.topic.subject.name if ps.learning_module and ps.learning_module.concept and ps.learning_module.concept.topic and ps.learning_module.concept.topic.subject else None,
        academic_level=ps.academic_level,
        title=ps.title,
        description=ps.description,
        difficulty=ps.difficulty,
        questions_count=len(ps.questions),
        questions=[
            PracticeQuestionRead(
                id=q.id,
                practice_set_id=q.practice_set_id,
                lesson_id=q.lesson_id,
                concept_id=q.concept_id,
                question_text=q.question_text,
                question_type=q.question_type,
                options=q.options,
                correct_index=None,
                explanation=None,
                difficulty=q.difficulty,
                points=q.points,
                order_index=q.order_index,
            )
            for q in ps.questions
        ],
    )


@router.post("/practice/submit", response_model=Any)
def submit_practice(
    payload: Any = Body(...),
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Submits student practice answers, grades the attempt, updates UserProgress,
    records QuizAttempt, and logs event in AcademicActivityLog.
    """
    from app.models.learning import PracticeSet, PracticeQuestion
    from app.models.progress import UserProgress, QuizAttempt, AcademicActivityLog

    if isinstance(payload, dict):
        ps_id = payload.get("set_id") or payload.get("practice_set_id")
        raw_answers = payload.get("answers", {})
    else:
        ps_id = getattr(payload, "set_id", None) or getattr(payload, "practice_set_id", None)
        raw_answers = getattr(payload, "answers", {})

    # Normalize answers map: dict of {question_id: selected_index}
    answers_map = {}
    if isinstance(raw_answers, list):
        for item in raw_answers:
            if isinstance(item, dict):
                qid = item.get("question_id") or item.get("id")
                ans = item.get("selected_index", -1)
                if qid:
                    answers_map[qid] = ans
            else:
                qid = getattr(item, "question_id", None)
                ans = getattr(item, "selected_index", -1)
                if qid:
                    answers_map[qid] = ans
    elif isinstance(raw_answers, dict):
        answers_map = raw_answers

    ps = db.query(PracticeSet).filter(PracticeSet.id == ps_id).first()
    if not ps:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Practice set not found.",
        )

    questions = db.query(PracticeQuestion).filter(PracticeQuestion.practice_set_id == ps_id).all()
    if not questions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No questions found in this practice set.",
        )

    score = 0
    total_points = 0
    correct_count = 0
    results = []

    for q in questions:
        total_points += q.points
        chosen = answers_map.get(q.id)
        is_correct = chosen == q.correct_index
        points_earned = q.points if is_correct else 0
        if is_correct:
            correct_count += 1
            score += points_earned

        results.append(
            {
                "question_id": q.id,
                "question_text": q.question_text,
                "selected_index": chosen if chosen is not None else -1,
                "chosen_index": chosen if chosen is not None else -1,
                "correct_index": q.correct_index,
                "is_correct": is_correct,
                "explanation": q.explanation,
                "points_earned": points_earned,
            }
        )

    accuracy_percent = (correct_count / len(questions)) * 100.0 if questions else 0.0

    # Record QuizAttempt
    attempt = QuizAttempt(
        user_id=current_user.id,
        academic_level=ps.academic_level,
        concept_id=ps.concept_id or ps.id,
        subject_id=ps.subject_id,
        score=score,
        total_questions=len(questions),
        details={"accuracy": f"{accuracy_percent:.1f}%", "practice_set_id": ps.id},
    )
    db.add(attempt)

    # Update or insert UserProgress
    if ps.concept_id:
        prog = (
            db.query(UserProgress)
            .filter(
                UserProgress.user_id == current_user.id,
                UserProgress.concept_id == ps.concept_id,
                UserProgress.academic_level == ps.academic_level,
            )
            .first()
        )
        if not prog:
            prog = UserProgress(
                user_id=current_user.id,
                academic_level=ps.academic_level,
                concept_id=ps.concept_id,
                subject_id=ps.subject_id,
                module_id=ps.module_id,
                lesson_id=ps.lesson_id,
                status="practiced" if accuracy_percent >= 60 else "exploring",
                mastery_score=accuracy_percent / 100.0,
            )
            db.add(prog)
        else:
            prog.status = "practiced" if accuracy_percent >= 60 else prog.status
            prog.mastery_score = max(prog.mastery_score, accuracy_percent / 100.0)
            prog.last_studied_at = datetime.utcnow()

    # Log milestone activity
    log = AcademicActivityLog(
        user_id=current_user.id,
        academic_level=ps.academic_level,
        subject_id=ps.subject_id,
        concept_id=ps.concept_id,
        lesson_id=ps.lesson_id,
        action_type="completed_practice",
        title=f"Completed Practice: {ps.title} ({accuracy_percent:.0f}%)",
        entity_type="practice",
        entity_id=ps.id,
        metadata_json={"accuracy": f"{accuracy_percent:.1f}%", "score": score},
    )
    db.add(log)
    db.commit()

    return {
        "set_id": ps.id,
        "practice_set_id": ps.id,
        "academic_level": ps.academic_level,
        "score": score,
        "total_points": total_points,
        "total_questions": len(questions),
        "correct_count": correct_count,
        "score_percentage": accuracy_percent,
        "accuracy_percent": accuracy_percent,
        "passed": accuracy_percent >= 60.0,
        "results": results,
        "breakdown": results,
    }


# Direct /api/v1/ curriculum aliases
curriculum_alias_router = APIRouter(tags=["Curriculum API"])
curriculum_alias_router.add_api_route("/subjects", list_subjects, methods=["GET"], response_model=List[SubjectRead])
curriculum_alias_router.add_api_route("/subjects/{subject_identifier}", get_subject_detail, methods=["GET"], response_model=SubjectDetail)
curriculum_alias_router.add_api_route("/subjects/{subject_identifier}/topics", list_subject_topics, methods=["GET"], response_model=List[TopicRead])
curriculum_alias_router.add_api_route("/topics/{topic_identifier}", get_topic_detail, methods=["GET"], response_model=TopicDetail)
curriculum_alias_router.add_api_route("/topics/{topic_identifier}/concepts", list_topic_concepts, methods=["GET"], response_model=List[ConceptRead])
curriculum_alias_router.add_api_route("/concepts/{concept_identifier}", get_concept_detail, methods=["GET"], response_model=ConceptDetail)
curriculum_alias_router.add_api_route("/concepts/{concept_identifier}/modules", list_concept_modules, methods=["GET"], response_model=List[LearningModuleSummary])
curriculum_alias_router.add_api_route("/modules/{module_identifier}", get_module_detail, methods=["GET"], response_model=LearningModuleDetail)
curriculum_alias_router.add_api_route("/modules/{module_identifier}/lessons", list_module_lessons, methods=["GET"], response_model=List[LessonRead])
curriculum_alias_router.add_api_route("/lessons/{lesson_identifier}", get_lesson_detail, methods=["GET"], response_model=LessonDetailRead)
