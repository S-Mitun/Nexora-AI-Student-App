from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload, selectinload

from app.db.session import get_db
from app.api.dependencies import get_current_user
from app.core.security import AuthenticatedUser
from app.models.profile import UserProfile
from app.models.learning import Subject, StudentSubject, Curriculum, Topic, Concept
from app.models.documents import Document
from app.models.progress import UserProgress, QuizAttempt, AcademicActivityLog
from app.schemas.workspace import (
    WorkspaceOverview,
    ProfileCompleteness,
    AcademicIdentity,
    MaterialsSummary,
    LearningToolStatus,
    AcademicProgressOverview,
    SubjectProgressRead,
)
from app.schemas.activity import ActivityLogRead, ActivityFeedResponse, ActivityLogCreate
from app.schemas.learning import SubjectRead, StudentSubjectRead, StudentSubjectCreate
from app.schemas.documents import DocumentRead
from app.schemas.context import AcademicContextResponse
from app.services.learning.context_service import AcademicContextResolver

workspace_router = APIRouter(tags=["Academic Workspace"])


def compute_profile_completeness(profile: UserProfile) -> ProfileCompleteness:
    """Calculates completion score and missing fields for a student's academic profile."""
    missing = []
    total_checks = 5
    passed_checks = 0

    # 1. Full name
    if profile.full_name and profile.full_name.strip():
        passed_checks += 1
    else:
        missing.append("full_name")

    # 2. Education Level & Category
    if profile.education_level and profile.education_category:
        passed_checks += 1
    else:
        missing.append("education_level")

    # 3. Grade / Class / Year
    if profile.grade_level and profile.grade_level.strip():
        passed_checks += 1
    else:
        missing.append("grade_level")

    # 4. Curriculum / Board
    if profile.curriculum_id:
        passed_checks += 1
    else:
        missing.append("curriculum_id")

    # 5. Domain / Stream / Degree
    if profile.academic_domain and profile.academic_domain.strip():
        passed_checks += 1
    else:
        missing.append("academic_domain")

    # Higher Education conditional checks
    is_higher_ed = profile.education_level in ["undergraduate", "postgraduate", "research"]
    if is_higher_ed:
        total_checks += 1
        if (profile.degree and profile.degree.strip()) or (profile.institution and profile.institution.strip()):
            passed_checks += 1
        else:
            missing.append("institution_or_degree")

    score = int((passed_checks / total_checks) * 100)
    is_complete = len(missing) == 0

    return ProfileCompleteness(
        score=score,
        is_complete=is_complete,
        missing_fields=missing,
    )


@workspace_router.get("", response_model=WorkspaceOverview)
def get_academic_workspace(
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Returns the student's unified Academic Workspace overview.
    Integrates verified academic identity, enrolled subjects, real uploaded materials,
    and honest learning tool statuses.
    """
    # 1. Fetch Student Profile
    profile = db.query(UserProfile).filter(UserProfile.id == current_user.id).first()
    if not profile:
        profile = UserProfile(
            id=current_user.id,
            email=current_user.email,
            education_level="undergraduate",
            education_category="undergraduate",
            grade_level="Class 10",
            academic_domain="General Studies",
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)

    # 2. Compute Completeness
    completeness = compute_profile_completeness(profile)

    # 3. Fetch Curriculum details if linked
    curriculum = None
    if profile.curriculum_id:
        curriculum = db.query(Curriculum).filter(Curriculum.id == profile.curriculum_id).first()

    # 3. Resolve Authoritative Academic Context
    academic_context = AcademicContextResolver.resolve_context(db, current_user.id)

    academic_identity = AcademicIdentity(
        education_level=profile.education_level or "undergraduate",
        education_category=profile.education_category or "undergraduate",
        grade_level=profile.grade_level or "Class 10",
        curriculum_id=profile.curriculum_id,
        curriculum_name=curriculum.name if curriculum else None,
        curriculum_code=curriculum.code if curriculum else None,
        board_authority=curriculum.board_authority if curriculum else None,
        academic_domain=profile.academic_domain or "General Studies",
        state_region=profile.state_region,
        institution=profile.institution,
        degree=profile.degree,
        department=profile.department,
        specialization=profile.specialization,
        academic_year=profile.academic_year,
        preferred_language=profile.preferred_language or "en",
    )

    # 4. Fetch Enrolled Subjects strictly scoped to active academic context
    enrolled_links = (
        db.query(StudentSubject)
        .options(
            joinedload(StudentSubject.subject).joinedload(Subject.curriculum),
            joinedload(StudentSubject.subject).selectinload(Subject.topics).selectinload(Topic.concepts),
        )
        .join(Subject, Subject.id == StudentSubject.subject_id)
        .filter(
            StudentSubject.user_id == current_user.id,
            StudentSubject.is_active == True,
            (StudentSubject.academic_level == academic_context.academic_level) | (StudentSubject.academic_level == None),
        )
        .all()
    )

    enrolled_subjects = []
    for link in enrolled_links:
        if link.subject and AcademicContextResolver.level_matches(link.subject.education_level, academic_context.academic_level):
            subj_read = SubjectRead(
                id=link.subject.id,
                curriculum_id=link.subject.curriculum_id,
                name=link.subject.name,
                slug=link.subject.slug,
                description=link.subject.description,
                icon=link.subject.icon,
                category=link.subject.category,
                difficulty_level=link.subject.difficulty_level,
                education_level=link.subject.education_level,
                academic_domain=link.subject.academic_domain,
                is_system=link.subject.is_system,
                is_enrolled=True,
                order_index=link.subject.order_index,
                is_active=link.subject.is_active,
                topic_count=len(link.subject.topics) if link.subject.topics else 0,
                concept_count=sum(len(t.concepts) for t in link.subject.topics) if link.subject.topics else 0,
            )
            enrolled_subjects.append(subj_read)

    # 5. Fetch Genuine Uploaded Materials
    user_docs = (
        db.query(Document)
        .filter(Document.user_id == current_user.id)
        .order_by(Document.created_at.desc())
        .all()
    )
    total_docs = len(user_docs)
    ready_docs = sum(1 for d in user_docs if d.status in ["completed", "ready"])
    processing_docs = sum(1 for d in user_docs if d.status in ["queued", "processing", "validating", "extracting_text", "analyzing_structure", "chunking"])
    failed_docs = sum(1 for d in user_docs if d.status == "failed")

    recent_doc_reads = [DocumentRead.model_validate(d) for d in user_docs[:5]]

    materials_summary = MaterialsSummary(
        total_count=total_docs,
        ready_count=ready_docs,
        processing_count=processing_docs,
        failed_count=failed_docs,
        recent_materials=recent_doc_reads,
    )

    # 6. Honest Educational Tool Statuses
    learning_tools = [
        LearningToolStatus(
            id="tool-learn",
            name="Concept Lessons",
            description="Master atomic concepts through intuition, motivation, and verified explanations.",
            icon="BookOpen",
            route="/learn",
            status="active",
            phase_label="Live",
        ),
        LearningToolStatus(
            id="tool-materials",
            name="Study Materials Hub",
            description="Manage uploaded textbooks, lecture slides, and notes powering your workspace.",
            icon="FolderKanban",
            route="/materials",
            status="active",
            phase_label="Live",
        ),
        LearningToolStatus(
            id="tool-practice",
            name="Concept Practice Checks",
            description="Test your understanding with concept-aligned questions and immediate feedback.",
            icon="CheckCircle2",
            route="/practice",
            status="active",
            phase_label="Live",
        ),
        LearningToolStatus(
            id="tool-notes",
            name="Personal Academic Notes",
            description="Record insights, formulas, and summaries attached directly to concepts.",
            icon="FileText",
            route="/notes",
            status="active",
            phase_label="Live",
        ),
        LearningToolStatus(
            id="tool-mindmap",
            name="Concept Knowledge Map",
            description="Visualize the conceptual hierarchy and prerequisite relationships.",
            icon="Binary",
            route="/mindmap",
            status="active",
            phase_label="Live",
        ),
        LearningToolStatus(
            id="tool-tutor",
            name="AI Academic Tutor",
            description="Conversational academic dialogue grounded strictly in your syllabus and materials.",
            icon="Sparkles",
            route="/chat",
            status="upcoming_prompt",
            phase_label="Phase 2 (Prompt 10)",
        ),
        LearningToolStatus(
            id="tool-labs",
            name="Concept Simulations & Labs",
            description="Parameter-tuning models and virtual experiments tied to scientific concepts.",
            icon="Cpu",
            route="/labs",
            status="upcoming_prompt",
            phase_label="Phase 2 (Prompt 20)",
        ),
    ]

    starter_subjects_available = (
        db.query(Subject)
        .filter(Subject.is_system == True, Subject.is_active == True)
        .count()
    )

    return WorkspaceOverview(
        profile_completeness=completeness,
        academic_identity=academic_identity,
        academic_context=academic_context,
        enrolled_subjects=enrolled_subjects,
        materials_summary=materials_summary,
        learning_tools=learning_tools,
        starter_subjects_available=starter_subjects_available,
    )


@workspace_router.get("/context", response_model=AcademicContextResponse)
def get_academic_context(
    active_subject: Optional[str] = None,
    active_concept: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Returns the student's normalized, authoritative Academic Context.
    Derived dynamically from authenticated profile, curriculum board overlay,
    enrolled subjects, and verified uploaded materials.
    """
    return AcademicContextResolver.resolve_context(
        db=db,
        user_id=current_user.id,
        active_subject_slug=active_subject,
        active_concept_slug=active_concept,
    )


@workspace_router.post("/enroll-subject", response_model=StudentSubjectRead, status_code=status.HTTP_201_CREATED)
def enroll_subject(
    payload: StudentSubjectCreate,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Enrolls the authenticated student in an academic subject.
    Establishes real student subject ownership and prevents arbitrary subject forcing.
    """
    subject = db.query(Subject).filter(Subject.id == payload.subject_id, Subject.is_active == True).first()
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Subject with id '{payload.subject_id}' not found.",
        )

    # Check for existing enrollment
    ctx = AcademicContextResolver.resolve_context(db, current_user.id)
    existing = (
        db.query(StudentSubject)
        .filter(StudentSubject.user_id == current_user.id, StudentSubject.subject_id == payload.subject_id)
        .first()
    )
    if existing:
        if not existing.is_active or existing.academic_level != ctx.academic_level:
            existing.is_active = True
            existing.academic_level = ctx.academic_level
            existing.enrollment_source = payload.enrollment_source
            db.commit()
            db.refresh(existing)
        return existing

    enrollment = StudentSubject(
        user_id=current_user.id,
        subject_id=payload.subject_id,
        academic_level=ctx.academic_level,
        enrollment_source=payload.enrollment_source,
        is_active=True,
    )
    db.add(enrollment)
    db.commit()
    db.refresh(enrollment)
    return enrollment


@workspace_router.delete("/enroll-subject/{subject_id}", status_code=status.HTTP_200_OK)
def unenroll_subject(
    subject_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Unenrolls the authenticated student from an academic subject.
    """
    enrollment = (
        db.query(StudentSubject)
        .filter(StudentSubject.user_id == current_user.id, StudentSubject.subject_id == subject_id)
        .first()
    )
    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Subject enrollment for '{subject_id}' not found for this student.",
        )

    db.delete(enrollment)
    db.commit()
    return {"success": True, "message": "Successfully unenrolled from subject."}


@workspace_router.get("/enrolled-subjects", response_model=List[SubjectRead])
def list_enrolled_subjects(
    academic_level: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Returns only the subjects actively enrolled by the current student for the active academic level.
    """
    target_level = academic_level
    if not target_level:
        ctx = AcademicContextResolver.resolve_context(db, current_user.id)
        target_level = ctx.academic_level

    enrolled_links = (
        db.query(StudentSubject)
        .options(
            joinedload(StudentSubject.subject).joinedload(Subject.curriculum),
            joinedload(StudentSubject.subject).selectinload(Subject.topics).selectinload(Topic.concepts),
        )
        .join(Subject, Subject.id == StudentSubject.subject_id)
        .filter(
            StudentSubject.user_id == current_user.id,
            StudentSubject.is_active == True,
            (StudentSubject.academic_level == target_level) | (StudentSubject.academic_level == None),
        )
        .all()
    )

    results = []
    for link in enrolled_links:
        if link.subject and AcademicContextResolver.level_matches(link.subject.education_level, target_level):
            results.append(
                SubjectRead(
                    id=link.subject.id,
                    curriculum_id=link.subject.curriculum_id,
                    name=link.subject.name,
                    slug=link.subject.slug,
                    description=link.subject.description,
                    icon=link.subject.icon,
                    category=link.subject.category,
                    difficulty_level=link.subject.difficulty_level,
                    education_level=link.subject.education_level,
                    academic_domain=link.subject.academic_domain,
                    is_system=link.subject.is_system,
                    is_enrolled=True,
                    order_index=link.subject.order_index,
                    is_active=link.subject.is_active,
                    topic_count=len(link.subject.topics) if link.subject.topics else 0,
                    concept_count=sum(len(t.concepts) for t in link.subject.topics) if link.subject.topics else 0,
                )
            )
    return results


@workspace_router.get("/activity", response_model=ActivityFeedResponse)
def get_workspace_activity(
    limit: int = 15,
    academic_level: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Returns authenticated student's learning activity feed strictly scoped to active academic level.
    Guarantees that actions from another academic level never leak into the active dashboard.
    """
    from app.models.progress import AcademicActivityLog
    from app.schemas.activity import ActivityLogRead, ActivityFeedResponse

    target_level = academic_level
    if not target_level:
        ctx = AcademicContextResolver.resolve_context(db, current_user.id)
        target_level = ctx.academic_level

    logs = (
        db.query(AcademicActivityLog)
        .filter(
            AcademicActivityLog.user_id == current_user.id,
            AcademicActivityLog.academic_level == target_level,
        )
        .order_by(AcademicActivityLog.created_at.desc())
        .limit(limit)
        .all()
    )

    total_count = (
        db.query(AcademicActivityLog)
        .filter(
            AcademicActivityLog.user_id == current_user.id,
            AcademicActivityLog.academic_level == target_level,
        )
        .count()
    )

    activities = []
    now = datetime.utcnow()
    for l in logs:
        read_obj = ActivityLogRead.model_validate(l)
        # Calculate human-friendly time_ago
        diff = (now - l.created_at.replace(tzinfo=None)).total_seconds()
        if diff < 60:
            read_obj.time_ago = "Just now"
        elif diff < 3600:
            read_obj.time_ago = f"{int(diff // 60)}m ago"
        elif diff < 86400:
            read_obj.time_ago = f"{int(diff // 3600)}h ago"
        else:
            read_obj.time_ago = f"{int(diff // 86400)}d ago"
        activities.append(read_obj)

    return ActivityFeedResponse(
        academic_level=target_level,
        activities=activities,
        total_count=total_count,
    )


@workspace_router.post("/activity", response_model=ActivityLogRead, status_code=status.HTTP_201_CREATED)
def record_workspace_activity(
    payload: ActivityLogCreate,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Records an event-driven student milestone, strictly tagging it with the student's active level.
    """
    from app.models.progress import AcademicActivityLog
    from app.schemas.activity import ActivityLogRead

    level = payload.academic_level
    if not level:
        ctx = AcademicContextResolver.resolve_context(db, current_user.id)
        level = ctx.academic_level

    log_entry = AcademicActivityLog(
        user_id=current_user.id,
        academic_level=level,
        curriculum_id=payload.curriculum_id,
        subject_id=payload.subject_id,
        module_id=payload.module_id,
        lesson_id=payload.lesson_id,
        concept_id=payload.concept_id,
        action_type=payload.action_type or payload.activity_type or "milestone",
        title=payload.title,
        entity_type=payload.entity_type or "workspace",
        entity_id=payload.entity_id,
        metadata_json=payload.metadata_json or payload.meta or {},
    )
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)

    read_obj = ActivityLogRead.model_validate(log_entry)
    read_obj.time_ago = "Just now"
    return read_obj


@workspace_router.get("/progress", response_model=AcademicProgressOverview)
def get_workspace_progress(
    academic_level: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Computes genuine student academic progress strictly scoped to the active academic level.
    Derives completion percentage from verified user activity and completed concepts.
    """
    from app.models.progress import UserProgress, QuizAttempt, AcademicActivityLog
    from app.schemas.workspace import AcademicProgressOverview, SubjectProgressRead

    target_level = academic_level
    if not target_level:
        ctx = AcademicContextResolver.resolve_context(db, current_user.id)
        target_level = ctx.academic_level

    # 1. Fetch completed / mastered concepts for this user and level
    progress_records = (
        db.query(UserProgress)
        .filter(
            UserProgress.user_id == current_user.id,
            UserProgress.academic_level == target_level,
            UserProgress.status.in_(["practiced", "mastered", "completed"]),
        )
        .all()
    )
    completed_lessons_count = len(progress_records)

    # 2. Fetch quiz attempts for this level
    quiz_count = (
        db.query(QuizAttempt)
        .filter(
            QuizAttempt.user_id == current_user.id,
            QuizAttempt.academic_level == target_level,
        )
        .count()
    )

    # 3. Enrolled subjects for this user and active level
    enrolled_records = (
        db.query(StudentSubject)
        .options(
            joinedload(StudentSubject.subject).selectinload(Subject.topics).selectinload(Topic.concepts)
        )
        .join(Subject, Subject.id == StudentSubject.subject_id)
        .filter(
            StudentSubject.user_id == current_user.id,
            StudentSubject.is_active == True,
            (StudentSubject.academic_level == target_level) | (StudentSubject.academic_level == None),
        )
        .all()
    )
    enrolled_records = [
        link for link in enrolled_records
        if link.subject and AcademicContextResolver.level_matches(link.subject.education_level, target_level)
    ]
    enrolled_count = len(enrolled_records)

    # 4. Subject breakdown
    subject_progress_list = []
    total_possible_concepts = 0
    total_mastered_concepts = 0

    for link in enrolled_records:
        subj = link.subject
        if subj:
            subj_concept_ids = set()
            for t in subj.topics:
                for c in t.concepts:
                    subj_concept_ids.add(c.id)

            subj_total = len(subj_concept_ids)
            total_possible_concepts += subj_total

            subj_completed = sum(1 for p in progress_records if p.concept_id in subj_concept_ids)
            total_mastered_concepts += subj_completed

            percent = int((subj_completed / subj_total) * 100) if subj_total > 0 else 0
            subject_progress_list.append(
                SubjectProgressRead(
                    subject_id=subj.id,
                    subject_name=subj.name,
                    progress_percent=percent,
                    completed_topics_count=subj_completed,
                    total_topics_count=subj_total,
                )
            )

    overall_percent = (
        int((total_mastered_concepts / total_possible_concepts) * 100)
        if total_possible_concepts > 0
        else (min(100, completed_lessons_count * 10) if completed_lessons_count > 0 else 0)
    )

    # Approximate study minutes from activity count
    activity_count = (
        db.query(AcademicActivityLog)
        .filter(
            AcademicActivityLog.user_id == current_user.id,
            AcademicActivityLog.academic_level == target_level,
        )
        .count()
    )
    study_minutes = activity_count * 15 + completed_lessons_count * 20

    return AcademicProgressOverview(
        academic_level=target_level,
        overall_progress_percent=overall_percent,
        completed_lessons_count=completed_lessons_count,
        completed_quizzes_count=quiz_count,
        enrolled_subjects_count=enrolled_count,
        study_minutes=study_minutes,
        subject_progress=subject_progress_list,
    )
