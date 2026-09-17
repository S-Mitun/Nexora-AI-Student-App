import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.dependencies import get_optional_user
from app.core.security import AuthenticatedUser
from app.models.profile import UserProfile
from app.schemas.learning import (
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
from app.services.learning.curriculum_service import CurriculumService, CurriculumSeedService
from app.services.learning.concept_service import ConceptService
from app.services.learning.personalization_service import (
    PersonalizationService,
    RecommendedTopic,
    PersonalizedContext,
)
from app.core.logging import logger

router = APIRouter(prefix="/learning", tags=["Learning Engine & Curriculum"])


# ==============================================================================
# LEVEL 1 — SUBJECT ENDPOINTS
# ==============================================================================

@router.get("/subjects", response_model=List[SubjectRead])
def list_subjects(db: Session = Depends(get_db)):
    """
    Returns all active academic subjects with computed topic and concept counts.
    Ensures starter curriculum is seeded if the database is unpopulated.
    """
    CurriculumSeedService.seed_if_empty(db)
    subjects = CurriculumService.get_subjects(db)

    results = []
    for sub in subjects:
        total_concepts = sum(len(top.concepts) for top in sub.topics)
        results.append(
            SubjectRead(
                id=sub.id,
                name=sub.name,
                slug=sub.slug,
                description=sub.description,
                icon=sub.icon,
                category=sub.category,
                difficulty_level=sub.difficulty_level,
                order_index=sub.order_index,
                is_active=sub.is_active,
                topic_count=len(sub.topics),
                concept_count=total_concepts,
            )
        )
    return results


@router.get("/subjects/{subject_identifier}", response_model=SubjectDetail)
def get_subject_detail(subject_identifier: str, db: Session = Depends(get_db)):
    """
    Retrieves full details for a subject by UUID or unique slug,
    including its syllabus topics and nested concepts.
    """
    CurriculumSeedService.seed_if_empty(db)
    sub = CurriculumService.get_subject(db, subject_identifier)
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Subject '{subject_identifier}' not found in curriculum.",
        )

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
def list_subject_topics(subject_identifier: str, db: Session = Depends(get_db)):
    """Returns all topics belonging to a specific subject."""
    CurriculumSeedService.seed_if_empty(db)
    topics = CurriculumService.get_topics_for_subject(db, subject_identifier)
    if not topics and not CurriculumService.get_subject(db, subject_identifier):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Subject '{subject_identifier}' not found.",
        )

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
def get_topic_detail(topic_identifier: str, db: Session = Depends(get_db)):
    """Retrieves full topic details including nested concepts."""
    CurriculumSeedService.seed_if_empty(db)
    top = CurriculumService.get_topic(db, topic_identifier)
    if not top:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Topic '{topic_identifier}' not found in curriculum.",
        )

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
def list_topic_concepts(topic_identifier: str, db: Session = Depends(get_db)):
    """Returns all concepts belonging to a specific topic."""
    CurriculumSeedService.seed_if_empty(db)
    concepts = CurriculumService.get_concepts_for_topic(db, topic_identifier)
    if not concepts and not CurriculumService.get_topic(db, topic_identifier):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Topic '{topic_identifier}' not found.",
        )

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

@router.get("/concepts/{concept_identifier}", response_model=ConceptDetail)
def get_concept_detail(concept_identifier: str, db: Session = Depends(get_db)):
    """Retrieves full concept details including its structured learning modules."""
    CurriculumSeedService.seed_if_empty(db)
    con = CurriculumService.get_concept(db, concept_identifier)
    if not con:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Concept '{concept_identifier}' not found in curriculum.",
        )

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
def list_concept_modules(concept_identifier: str, db: Session = Depends(get_db)):
    """Returns all learning modules for a concept."""
    CurriculumSeedService.seed_if_empty(db)
    modules = CurriculumService.get_modules_for_concept(db, concept_identifier)
    if not modules and not CurriculumService.get_concept(db, concept_identifier):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Concept '{concept_identifier}' not found.",
        )

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

@router.get("/modules/{module_identifier}", response_model=LearningModuleDetail)
def get_module_detail(module_identifier: str, db: Session = Depends(get_db)):
    """Retrieves full learning module detail with syllabus lessons and parent breadcrumbs."""
    CurriculumSeedService.seed_if_empty(db)
    mod = CurriculumService.get_module(db, module_identifier)
    if not mod:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Learning module '{module_identifier}' not found.",
        )

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
def list_module_lessons(module_identifier: str, db: Session = Depends(get_db)):
    """Returns all lessons belonging to a learning module."""
    CurriculumSeedService.seed_if_empty(db)
    lessons = CurriculumService.get_lessons_for_module(db, module_identifier)
    if not lessons and not CurriculumService.get_module(db, module_identifier):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Learning module '{module_identifier}' not found.",
        )

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

@router.get("/lessons/{lesson_identifier}", response_model=LessonDetailRead)
def get_lesson_detail(
    lesson_identifier: str,
    current_user: Optional[AuthenticatedUser] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """
    Retrieves full lesson content, breadcrumb context, and previous/next navigation pointers.
    Integrates with Prompt 04 to contextualize examples using student profile interests.
    """
    CurriculumSeedService.seed_if_empty(db)
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
    Falls back gracefully to curriculum standard foundations if no interests are selected.
    """
    student_interests = []
    favorite_subjects = []

    if current_user:
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

    return PersonalizationService.get_recommended_topics(
        student_interests=student_interests,
        favorite_subjects=favorite_subjects,
    )


@router.get("/perspectives/{concept_slug}", response_model=List[PersonalizedContext])
def get_perspectives(concept_slug: str):
    """
    Retrieves all available interest-relatable perspectives for a specific concept,
    allowing students to toggle between Gaming, Cricket, Cars, Music, and Space perspectives.
    """
    clean_slug = concept_slug.replace("-", " ")
    return PersonalizationService.get_all_perspectives_for_concept(clean_slug)


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
