import pytest
from sqlalchemy.orm import Session
from app.core.security import SecurityContext
from app.models.profile import UserProfile
from app.models.learning import Subject, Topic, Concept, LearningModule, Lesson, StudentSubject
from app.models.syllabus import (
    Syllabus,
    SyllabusVersion,
    SyllabusCurriculumDraft,
    SyllabusDraftSubject,
    SyllabusDraftModule,
    SyllabusDraftTopic,
    SyllabusDraftOutcome,
)
import uuid


@pytest.fixture
def student_06r_headers():
    token = SecurityContext.create_test_jwt(user_id="student-06r-uuid-001", email="student.06r@nexora.edu")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def student_other_headers():
    token = SecurityContext.create_test_jwt(user_id="student-other-uuid-002", email="student.other@nexora.edu")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def setup_06r_active_curriculum(db_session: Session):
    """Sets up an authentic activated curriculum with draft metadata and runtime entities."""
    db = db_session
    user_id = "student-06r-uuid-001"

    # 1. Profile
    profile = db.query(UserProfile).filter(UserProfile.id == user_id).first()
    if not profile:
        profile = UserProfile(
            id=user_id,
            email="student.06r@nexora.edu",
            full_name="06R Test Student",
            education_level="undergraduate",
            education_category="undergraduate",
            academic_domain="Computer Science",
            interests='["Gaming"]',
            profile_completed=True,
        )
        db.add(profile)
        db.flush()

    # 2. Syllabus & Version
    syl = Syllabus(
        id=f"syl-06r-{uuid.uuid4().hex[:8]}",
        user_id=user_id,
        title="Distributed Systems Engineering",
        academic_level="undergraduate",
        status="active",
        program_degree="B.Tech Computer Science",
    )
    db.add(syl)
    db.flush()

    ver = SyllabusVersion(
        id=f"ver-06r-{uuid.uuid4().hex[:8]}",
        syllabus_id=syl.id,
        version_number=1,
        is_active=True,
        curriculum_status="active",
        processing_status="completed",
    )
    db.add(ver)
    db.flush()

    # 3. Draft with authentic code, credits, outcomes, and modules
    draft = SyllabusCurriculumDraft(
        id=f"draft-06r-{uuid.uuid4().hex[:8]}",
        syllabus_version_id=ver.id,
        syllabus_id=syl.id,
        user_id=user_id,
        title="Distributed Systems Engineering",
        academic_level="undergraduate",
        status="approved",
        compilation_status="draft_ready",
        compilation_version=1,
    )
    db.add(draft)
    db.flush()

    d_subj = SyllabusDraftSubject(
        id=f"dsubj-06r-{uuid.uuid4().hex[:8]}",
        draft_id=draft.id,
        name="Distributed Systems Engineering",
        code="CS4201",
        credits="4 Credits",
        semester="7th Semester",
        evidence_text="Extracted from course regulation document for Distributed Systems.",
        sort_order=0,
    )
    db.add(d_subj)
    db.flush()

    outcome = SyllabusDraftOutcome(
        id=f"out-06r-{uuid.uuid4().hex[:8]}",
        draft_subject_id=d_subj.id,
        description="Design and implement fault-tolerant consensus algorithms.",
        sort_order=0,
    )
    db.add(outcome)
    db.flush()

    d_mod = SyllabusDraftModule(
        id=f"dmod-06r-{uuid.uuid4().hex[:8]}",
        draft_subject_id=d_subj.id,
        title="Consensus & Replication",
        display_label="Unit 1",
        original_label="Unit 1",
        evidence_text="Covers Paxos, Raft, Byzantine fault tolerance, and vector clocks.",
        source_page=12,
        sort_order=0,
    )
    db.add(d_mod)
    db.flush()

    d_top = SyllabusDraftTopic(
        id=f"dtop-06r-{uuid.uuid4().hex[:8]}",
        draft_module_id=d_mod.id,
        title="Raft Leader Election",
        evidence_text="State machine replication via term-based leader heartbeats.",
        source_page=14,
        sort_order=0,
        is_lesson_candidate=True,
    )
    db.add(d_top)
    db.flush()

    # 4. Runtime Materialized Entities
    rt_subj = Subject(
        id=f"sub-06r-{uuid.uuid4().hex[:8]}",
        name="Distributed Systems Engineering",
        slug=f"dist-sys-{uuid.uuid4().hex[:6]}",
        description="Core distributed systems course",
        icon="Cpu",
        category="Computer Science & Engineering",
        difficulty_level="advanced",
        education_level="undergraduate",
        academic_domain="Computer Science",
        is_system=False,
        user_id=user_id,
        syllabus_version_id=ver.id,
        content_source="syllabus_extracted",
        is_active=True,
    )
    db.add(rt_subj)
    db.flush()

    enrollment = StudentSubject(
        id=f"enr-06r-{uuid.uuid4().hex[:8]}",
        user_id=user_id,
        subject_id=rt_subj.id,
        academic_level="undergraduate",
        enrollment_source="curriculum_prescribed",
        is_active=True,
    )
    db.add(enrollment)
    db.flush()

    rt_topic = Topic(
        id=f"top-06r-{uuid.uuid4().hex[:8]}",
        subject_id=rt_subj.id,
        content_source="syllabus_extracted",
        name="Unit 1 - Consensus & Replication",
        slug=f"unit-1-consensus-{uuid.uuid4().hex[:6]}",
        description="Covers Paxos, Raft, Byzantine fault tolerance, and vector clocks.",
        order_index=0,
        is_active=True,
    )
    db.add(rt_topic)
    db.flush()

    rt_concept = Concept(
        id=f"con-06r-{uuid.uuid4().hex[:8]}",
        topic_id=rt_topic.id,
        content_source="syllabus_extracted",
        name="Raft Leader Election",
        slug=f"raft-leader-election-{uuid.uuid4().hex[:6]}",
        summary="State machine replication via term-based leader heartbeats.",
        short_description="Curriculum candidate: Raft Leader Election",
        difficulty_level="advanced",
        order_index=0,
        is_active=True,
        has_simulation=True,
        has_visualization=True,
        has_practice=True,
        has_lab=False,
        has_mindmap=True,
    )
    db.add(rt_concept)
    db.flush()

    rt_module = LearningModule(
        id=f"mod-06r-{uuid.uuid4().hex[:8]}",
        concept_id=rt_concept.id,
        content_source="syllabus_extracted",
        title="Raft Leader Election",
        slug=f"raft-mod-{uuid.uuid4().hex[:6]}",
        description="State machine replication via term-based leader heartbeats.",
        learning_objective="Understand randomized timeout leader election.",
        estimated_minutes=20,
        order_index=0,
        is_active=True,
    )
    db.add(rt_module)
    db.flush()

    rt_lesson1 = Lesson(
        id=f"les-06r-1-{uuid.uuid4().hex[:8]}",
        module_id=rt_module.id,
        content_source="syllabus_extracted",
        title="Raft Leader Election Overview",
        slug=f"raft-overview-{uuid.uuid4().hex[:6]}",
        content_type="explanation",
        content="# Raft Leader Election\n\n*Source: Distributed Systems Engineering, Page 14*\n\nEvidence from Syllabus:\n> State machine replication via term-based leader heartbeats.\n\n*Lesson instruction and interactive concepts will be developed during learning sessions.*",
        order_index=0,
        estimated_minutes=10,
        is_active=True,
    )
    db.add(rt_lesson1)

    rt_lesson2 = Lesson(
        id=f"les-06r-2-{uuid.uuid4().hex[:8]}",
        module_id=rt_module.id,
        content_source="syllabus_extracted",
        title="Raft Term Transitions",
        slug=f"raft-term-transitions-{uuid.uuid4().hex[:6]}",
        content_type="explanation",
        content="# Raft Term Transitions\n\n*Source: Distributed Systems Engineering, Page 15*\n\nEvidence from Syllabus:\n> Transitioning terms during election timeouts.\n\n*Lesson instruction and interactive concepts will be developed during learning sessions.*",
        order_index=1,
        estimated_minutes=10,
        is_active=True,
    )
    db.add(rt_lesson2)

    db.commit()

    context_data = {
        "user_id": user_id,
        "syllabus_id": syl.id,
        "version_id": ver.id,
        "subject_slug": rt_subj.slug,
        "topic_slug": rt_topic.slug,
        "concept_slug": rt_concept.slug,
        "lesson_1_slug": rt_lesson1.slug,
        "lesson_2_slug": rt_lesson2.slug,
    }
    return context_data


def test_06r_active_curriculum_workspace_overview(client, student_06r_headers, setup_06r_active_curriculum):
    """Verifies that /workspace returns active syllabus and genuine enrolled subjects."""
    res = client.get("/api/v1/workspace", headers=student_06r_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["syllabus_state"]["is_curriculum_active"] is True
    assert len(data["enrolled_subjects"]) >= 1

    active_sub = next(s for s in data["enrolled_subjects"] if s["name"] == "Distributed Systems Engineering")
    assert active_sub["code"] == "CS4201"
    assert active_sub["credits"] == "4 Credits"
    assert active_sub["semester"] == "7th Semester"
    assert active_sub["topic_count"] == 1
    assert active_sub["concept_count"] == 1


def test_06r_subject_listing_with_authentic_metadata(client, student_06r_headers, setup_06r_active_curriculum):
    """Verifies that /learning/subjects returns genuine subjects with authentic draft metadata."""
    res = client.get("/api/v1/learning/subjects", headers=student_06r_headers)
    assert res.status_code == 200
    subjects = res.json()
    assert len(subjects) >= 1

    dist_sub = next(s for s in subjects if s["name"] == "Distributed Systems Engineering")
    assert dist_sub["code"] == "CS4201"
    assert dist_sub["credits"] == "4 Credits"
    assert dist_sub["semester"] == "7th Semester"
    assert dist_sub["is_enrolled"] is True
    assert len(dist_sub["learning_outcomes"]) == 1
    assert "fault-tolerant consensus" in dist_sub["learning_outcomes"][0]


def test_06r_subject_details_and_child_units(client, student_06r_headers, setup_06r_active_curriculum):
    """Verifies that /learning/subjects/{subject_identifier} returns authentic child topics and outcomes."""
    sub_slug = setup_06r_active_curriculum["subject_slug"]
    res = client.get(f"/api/v1/learning/subjects/{sub_slug}", headers=student_06r_headers)
    assert res.status_code == 200
    sub_detail = res.json()
    assert sub_detail["name"] == "Distributed Systems Engineering"
    assert sub_detail["code"] == "CS4201"
    assert len(sub_detail["topics"]) == 1

    unit_1 = sub_detail["topics"][0]
    assert "Consensus & Replication" in unit_1["name"]
    assert unit_1["unit_label"] == "Unit 1"
    assert unit_1["source_page"] == 12
    assert "Paxos, Raft" in unit_1["evidence_text"]
    assert len(unit_1["concepts"]) == 1


def test_06r_topic_structural_detail_retrieval(client, student_06r_headers, setup_06r_active_curriculum):
    """Verifies that /learning/topics/{topic_identifier} returns authentic topic candidate details."""
    top_slug = setup_06r_active_curriculum["topic_slug"]
    res = client.get(f"/api/v1/learning/topics/{top_slug}", headers=student_06r_headers)
    assert res.status_code == 200
    top_detail = res.json()
    assert "Consensus & Replication" in top_detail["name"]
    assert top_detail["subject_name"] == "Distributed Systems Engineering"
    assert top_detail["unit_label"] == "Unit 1"
    assert top_detail["source_page"] == 12
    assert len(top_detail["concepts"]) == 1
    assert top_detail["concepts"][0]["name"] == "Raft Leader Election"


def test_06r_lesson_sibling_navigation_within_module(client, student_06r_headers, setup_06r_active_curriculum):
    """Verifies that /learning/lessons/{slug} provides correct navigation without leaking outside module."""
    les1_slug = setup_06r_active_curriculum["lesson_1_slug"]
    les2_slug = setup_06r_active_curriculum["lesson_2_slug"]

    res1 = client.get(f"/api/v1/learning/lessons/{les1_slug}", headers=student_06r_headers)
    assert res1.status_code == 200
    d1 = res1.json()
    assert d1["previous_lesson_slug"] is None
    assert d1["next_lesson_slug"] == les2_slug
    assert "Page 14" in d1["content"]

    res2 = client.get(f"/api/v1/learning/lessons/{les2_slug}", headers=student_06r_headers)
    assert res2.status_code == 200
    d2 = res2.json()
    assert d2["previous_lesson_slug"] == les1_slug
    assert d2["next_lesson_slug"] is None


def test_06r_context_and_user_isolation(client, student_other_headers, setup_06r_active_curriculum):
    """Verifies student B cannot access student A's private extracted syllabus subject or topic."""
    sub_slug = setup_06r_active_curriculum["subject_slug"]
    top_slug = setup_06r_active_curriculum["topic_slug"]

    # Student B should receive 404 Not Found for Student A's syllabus entities
    res_sub = client.get(f"/api/v1/learning/subjects/{sub_slug}", headers=student_other_headers)
    assert res_sub.status_code == 404

    res_top = client.get(f"/api/v1/learning/topics/{top_slug}", headers=student_other_headers)
    assert res_top.status_code == 404


def test_06r_inactive_curriculum_quarantine(client, db_session: Session, student_06r_headers, setup_06r_active_curriculum):
    """Verifies that deactivated or cancelled curriculum is excluded from active workspace views."""
    ver = db_session.query(SyllabusVersion).filter(SyllabusVersion.id == setup_06r_active_curriculum["version_id"]).first()
    ver.is_active = False
    ver.curriculum_status = "review_required"
    db_session.commit()

    # With curriculum inactive, /learning/subjects and /workspace/enrolled-subjects must return []
    res_enrolled = client.get("/api/v1/workspace/enrolled-subjects", headers=student_06r_headers)
    assert res_enrolled.status_code == 200
    assert res_enrolled.json() == []

    # Restore active state for cleanup
    ver = db_session.query(SyllabusVersion).filter(SyllabusVersion.id == setup_06r_active_curriculum["version_id"]).first()
    ver.is_active = True
    ver.curriculum_status = "active"
    db_session.commit()
