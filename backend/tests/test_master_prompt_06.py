import pytest
import uuid
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import SessionLocal
from app.models.profile import UserProfile
from app.models.learning import Subject, StudentSubject, Curriculum
from app.models.documents import Document
from app.services.learning.context_service import AcademicContextResolver
from app.schemas.context import (
    AcademicContextResponse,
    KnowledgeSourceRead,
    KnowledgeSourceType,
    AcademicAnswerResponse,
)


@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client():
    return TestClient(app)


def test_academic_context_resolution_class_1_5(db):
    user_id = f"test-p1-{uuid.uuid4()}"
    prof = UserProfile(
        id=user_id,
        email=f"p1_{uuid.uuid4().hex[:6]}@nexora.dev",
        education_level="class-1-5",
        education_category="primary",
        grade_level="Class 3",
        academic_domain="Environmental Studies & Basic Math",
    )
    db.add(prof)
    db.commit()

    try:
        ctx = AcademicContextResolver.resolve_context(db, user_id)
        assert ctx.user_id == user_id
        assert ctx.academic_level == "class_1_5"
        assert ctx.education_category == "primary"
        assert ctx.grade_level == "Class 3"
        assert ctx.knowledge_scope.baseline is True
        # Ensure zero CSE subject IDs are enrolled or referenced
        assert len(ctx.enrolled_subject_ids) == 0
    finally:
        db.delete(prof)
        db.commit()


def test_academic_context_resolution_class_6_10(db):
    user_id = f"test-sec-{uuid.uuid4()}"
    curriculum = db.query(Curriculum).filter(Curriculum.code == "cbse-secondary").first()
    curriculum_id = curriculum.id if curriculum else None

    prof = UserProfile(
        id=user_id,
        email=f"sec_{uuid.uuid4().hex[:6]}@nexora.dev",
        education_level="class-6-10",
        education_category="secondary",
        grade_level="Class 10",
        curriculum_id=curriculum_id,
        academic_domain="General Science & Mathematics",
    )
    db.add(prof)
    db.commit()

    try:
        ctx = AcademicContextResolver.resolve_context(db, user_id)
        assert ctx.user_id == user_id
        assert ctx.academic_level == "class_6_10"
        assert ctx.education_category == "secondary"
        assert ctx.grade_level == "Class 10"
        if curriculum:
            assert ctx.curriculum_code == "cbse-secondary"
            assert ctx.knowledge_scope.board_overlay is True
    finally:
        db.delete(prof)
        db.commit()


def test_academic_context_resolution_undergraduate(db):
    user_id = f"test-ug-{uuid.uuid4()}"
    curriculum = db.query(Curriculum).filter(Curriculum.code == "univ-eng-cse").first()
    curriculum_id = curriculum.id if curriculum else None

    prof = UserProfile(
        id=user_id,
        email=f"ug_{uuid.uuid4().hex[:6]}@nexora.dev",
        education_level="undergraduate",
        education_category="undergraduate",
        grade_level="Year 2",
        curriculum_id=curriculum_id,
        degree="B.Tech",
        department="Computer Science & Engineering",
        specialization="Systems Architecture",
        academic_year="2026-2027",
        institution="National Institute of Technology",
    )
    db.add(prof)
    db.commit()

    try:
        ctx = AcademicContextResolver.resolve_context(db, user_id)
        assert ctx.academic_level == "undergraduate"
        assert ctx.degree == "B.Tech"
        assert ctx.department == "Computer Science & Engineering"
        assert ctx.institution == "National Institute of Technology"
    finally:
        db.delete(prof)
        db.commit()


def test_level_change_workspace_isolation(db):
    user_id = f"test-switch-{uuid.uuid4()}"
    prof = UserProfile(
        id=user_id,
        email=f"switch_{uuid.uuid4().hex[:6]}@nexora.dev",
        education_level="undergraduate",
        education_category="undergraduate",
        grade_level="Year 3",
        degree="B.Tech",
        department="Computer Science",
    )
    db.add(prof)
    db.commit()

    try:
        # Context 1: Undergraduate
        ctx_ug = AcademicContextResolver.resolve_context(db, user_id)
        assert ctx_ug.academic_level == "undergraduate"

        # Level change: Student switches profile to Class 10 (Secondary)
        prof.education_level = "class-6-10"
        prof.education_category = "secondary"
        prof.grade_level = "Class 10"
        prof.degree = None
        prof.department = None
        db.commit()

        # Context 2: Secondary
        ctx_sec = AcademicContextResolver.resolve_context(db, user_id)
        assert ctx_sec.academic_level == "class_6_10"
        assert ctx_sec.education_category == "secondary"
        assert ctx_sec.grade_level == "Class 10"
        assert ctx_sec.degree is None
    finally:
        db.delete(prof)
        db.commit()


def test_multi_user_context_isolation(db):
    user_a_id = f"test-ctx-a-{uuid.uuid4()}"
    user_b_id = f"test-ctx-b-{uuid.uuid4()}"

    prof_a = UserProfile(id=user_a_id, email=f"a_{uuid.uuid4().hex[:6]}@nexora.dev", education_level="class-1-5", education_category="primary")
    prof_b = UserProfile(id=user_b_id, email=f"b_{uuid.uuid4().hex[:6]}@nexora.dev", education_level="undergraduate", education_category="undergraduate")
    db.add_all([prof_a, prof_b])
    db.commit()

    # User A uploads a document
    doc_a = Document(
        user_id=user_a_id,
        title="Primary Math Workbook",
        source_type="pdf",
        file_path="data/uploads/doc_a.pdf",
        status="completed",
    )
    db.add(doc_a)
    db.commit()

    try:
        ctx_a = AcademicContextResolver.resolve_context(db, user_a_id)
        ctx_b = AcademicContextResolver.resolve_context(db, user_b_id)

        assert doc_a.id in ctx_a.available_material_ids
        assert doc_a.id not in ctx_b.available_material_ids
        assert ctx_a.academic_level == "class_1_5"
        assert ctx_b.academic_level == "undergraduate"
    finally:
        db.delete(doc_a)
        db.delete(prof_a)
        db.delete(prof_b)
        db.commit()


def test_knowledge_source_and_academic_answer_contract():
    # 1. KnowledgeSource validation
    source = KnowledgeSourceRead(
        source_id="src-001",
        source_type=KnowledgeSourceType.OFFICIAL_CURRICULUM,
        title="CBSE Class 10 Science Curriculum Guideline",
        academic_level="class_6_10",
        board="CBSE",
        trust_priority=10,
    )
    assert source.source_type == KnowledgeSourceType.OFFICIAL_CURRICULUM
    assert source.trust_priority == 10

    # 2. AcademicAnswerResponse modular contract validation
    answer = AcademicAnswerResponse(
        concept_name="Force and Pressure Dynamics",
        academic_level="class_6_10",
        subject="General Science",
        evidence_level="supported_by_source",
        what_it_is="Force is an interaction that changes an object's motion. Pressure is force per unit area ($P = \\frac{F}{A}$).",
        why_it_matters="Explains hydraulic systems, atmospheric pressure, and structural loads.",
        how_it_works="Perpendicular force distributed across surface area.",
        example="A sharp knife cuts better than a blunt one because of higher pressure at the edge.",
        limitations="Assumes uniform force distribution across planar surface.",
        common_mistakes=["Confusing total force with pressure"],
        citations=[{"source_id": "src-001", "page": 42}],
    )
    assert answer.concept_name == "Force and Pressure Dynamics"
    assert answer.evidence_level == "supported_by_source"
    assert len(answer.citations) == 1


def test_api_get_workspace_context(client):
    user_id = str(uuid.uuid4())
    headers = {"Authorization": f"Bearer dev-student-{user_id}"}
    response = client.get("/api/v1/workspace/context", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == user_id
    assert "academic_level" in data
    assert "knowledge_scope" in data
    assert "enrolled_subject_ids" in data
    assert "available_material_ids" in data
