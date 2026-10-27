import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.profile import UserProfile
from app.models.syllabus import (
    Syllabus,
    SyllabusVersion,
    SyllabusCurriculumDraft,
    SyllabusDraftSubject,
    SyllabusDraftModule,
    SyllabusDraftTopic,
    SyllabusDraftOutcome,
    SyllabusProcessingJob,
)
from app.models.learning import Subject, LearningModule, Lesson, PracticeSet
from app.services.syllabus.extraction import get_document_extractor
from app.services.syllabus.extraction.base import ExtractedDocument, ExtractedPage
from app.services.syllabus.draft_engine import SyllabusDraftEngine
from app.services.syllabus.job_runner import SyllabusJobRunner
from app.services.syllabus.storage_service import SyllabusStorageService
from app.schemas.syllabus import SyllabusCanonicalStateResponse
from app.core.security import SecurityContext


USER_A_ID = "d52061f5-0fc1-497f-bbba-7142519eab0d"
USER_B_ID = "e8901234-5678-90ab-cdef-1234567890ab"
_candidate_path_a = os.path.join("data", "storage", "syllabi", USER_A_ID, "75af4ac9-7bab-46c8-b66c-f01ca4a8821f", "v1", "Algorithm_Design_Techniques___3rd_Semester.pdf")
_candidate_path_b = os.path.join("backend", "data", "storage", "syllabi", USER_A_ID, "75af4ac9-7bab-46c8-b66c-f01ca4a8821f", "v1", "Algorithm_Design_Techniques___3rd_Semester.pdf")
REAL_FILE_PATH = _candidate_path_a if os.path.exists(_candidate_path_a) else _candidate_path_b


@pytest.fixture
def test_users(db_session: Session):
    user_a = db_session.query(UserProfile).filter(UserProfile.id == USER_A_ID).first()
    if not user_a:
        user_a = UserProfile(
            id=USER_A_ID,
            email="user_a@nexora.edu",
            full_name="User Alpha",
            education_level="higher_education",
            degree="B.Tech Computer Science",
            academic_year="3rd Year",
            institution="Engineering College",
        )
        db_session.add(user_a)

    user_b = db_session.query(UserProfile).filter(UserProfile.id == USER_B_ID).first()
    if not user_b:
        user_b = UserProfile(
            id=USER_B_ID,
            email="user_b@nexora.edu",
            full_name="User Beta",
            education_level="higher_education",
            degree="B.Tech Information Technology",
            academic_year="2nd Year",
            institution="Engineering College",
        )
        db_session.add(user_b)

    db_session.commit()
    return user_a, user_b


def test_text_extractor_handles_plain_text():
    """Verifies that the text extractor extracts clean lines, sections, and metadata."""
    sample_text = (
        "Course Code: CS201\n"
        "Data Structures and Algorithms\n"
        "Unit I: Linear Data Structures\n"
        "Arrays, Linked Lists, Stacks, Queues\n"
        "Unit II: Trees and Graphs\n"
        "Binary Search Trees, AVL Trees, Graph Traversals\n"
        "Course Outcomes:\n"
        "CO1: Design and implement linear data structures\n"
        "CO2: Apply tree and graph algorithms\n"
    )
    temp_path = "backend/data/test_sample_syllabus.txt"
    os.makedirs(os.path.dirname(temp_path), exist_ok=True)
    with open(temp_path, "w", encoding="utf-8") as f:
        f.write(sample_text)

    try:
        extractor = get_document_extractor(temp_path)
        doc = extractor.extract(temp_path)
        assert doc.total_pages == 1
        assert "CS201" in doc.raw_text
        assert "Linear Data Structures" in doc.raw_text

        draft = SyllabusDraftEngine.parse_document(doc, "Data Structures and Algorithms", "Undergraduate")
        assert len(draft.subjects) == 1
        subject = draft.subjects[0]
        assert subject.code == "CS201"
        assert len(subject.modules) >= 2
        assert len(subject.outcomes) >= 2
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


def test_real_uploaded_syllabus_extraction_and_understanding():
    """
    Authoritative test on the user's real uploaded syllabus:
    Algorithm_Design_Techniques___3rd_Semester.pdf
    Validates:
    - PDFium + RapidOCR ONNX fallback
    - Accurate detection of course code (25CS301)
    - Accurate detection of course credits (45 Periods)
    - Accurate detection of semester (3rd Semester)
    - Extraction of 5 Units + 1 Lab Practical Module
    - Extraction of all 5 Course Outcomes (CO1 - CO5)
    - Source page citations and evidence quotes retained
    """
    if not os.path.exists(REAL_FILE_PATH):
        pytest.skip(f"Real syllabus file not found at {REAL_FILE_PATH}")

    extractor = get_document_extractor(REAL_FILE_PATH)
    doc = extractor.extract(REAL_FILE_PATH)

    assert doc.total_pages == 2
    assert doc.ocr_applied is True
    assert len(doc.raw_text) > 1000

    draft = SyllabusDraftEngine.parse_document(
        doc=doc,
        syllabus_title="Algorithm Design Techniques - 3rd Semester",
        academic_level="Undergraduate",
        institution="Autonomous Engineering College",
    )

    assert len(draft.subjects) == 1
    subject = draft.subjects[0]

    # Subject Metadata
    assert subject.name == "Algorithm Design Techniques"
    assert subject.code == "25CS301"
    assert subject.credits == "45 Periods"
    assert subject.semester == "3rd Semester"
    assert subject.source_page == 1
    assert "Page 1" in subject.evidence_text
    assert subject.confidence == "high"

    # Modules
    assert len(subject.modules) == 6
    labels = [m.display_label for m in subject.modules]
    assert "Unit 1" in labels
    assert "Unit 2" in labels
    assert "Unit 3" in labels
    assert "Unit 4" in labels
    assert "Unit 5" in labels
    assert "Lab Practical" in labels

    # Check specific units
    u1 = next(m for m in subject.modules if m.display_label == "Unit 1")
    assert "Introduction to Fundamentals" in u1.title
    assert len(u1.topics) >= 2

    u2 = next(m for m in subject.modules if m.display_label == "Unit 2")
    assert "Brute Force and Divide-and-Conquer" in u2.title
    assert any("Binary Search" in t.title for t in u2.topics)

    u3 = next(m for m in subject.modules if m.display_label == "Unit 3")
    assert "Dynamic Programming" in u3.title

    lab = next(m for m in subject.modules if m.display_label == "Lab Practical")
    assert len(lab.topics) >= 5

    # Course Outcomes (CO1 to CO5)
    assert len(subject.outcomes) == 5
    outcomes_text = " ".join(o.description for o in subject.outcomes)
    assert "CO1:" in outcomes_text
    assert "CO2:" in outcomes_text
    assert "CO3:" in outcomes_text
    assert "CO4:" in outcomes_text
    assert "CO5:" in outcomes_text
    for o in subject.outcomes:
        assert o.source_page == 2
        assert o.confidence == "high"


def test_zero_runtime_bleed_and_state_c_invariance(db_session: Session, test_users):
    """
    CRITICAL INVARIANT:
    Document understanding and curriculum draft generation must NOT:
    1. Create records in runtime tables: subjects, learning_modules, lessons, topics, concepts, practice_sets.
    2. Set is_curriculum_active = True.
    3. Prematurely activate the curriculum.
    """
    user_a, _ = test_users

    # Count existing runtime records
    runtime_subjects_before = db_session.query(Subject).count()
    runtime_modules_before = db_session.query(LearningModule).count()
    runtime_lessons_before = db_session.query(Lesson).count()
    runtime_practices_before = db_session.query(PracticeSet).count()

    # Create dummy syllabus & version for test
    syllabus = Syllabus(
        id="test-bleed-syl-01",
        user_id=user_a.id,
        title="Operating Systems Principles",
        academic_level="Undergraduate",
        status="uploaded",
    )
    db_session.add(syllabus)

    version = SyllabusVersion(
        id="test-bleed-ver-01",
        syllabus_id=syllabus.id,
        version_number=1,
        source_filename="test_os.txt",
        storage_path="backend/data/storage/test_os.txt",
        status="uploaded",
        curriculum_status="not_built",
        is_active=False,
    )
    db_session.add(version)
    db_session.commit()

    # Create a small dummy file
    os.makedirs("backend/data/storage", exist_ok=True)
    with open("backend/data/storage/test_os.txt", "w") as f:
        f.write("CS302 Operating Systems\nUnit 1 Process Management\nProcess Scheduling, Threads\n")

    try:
        # Run processing job synchronously
        job = SyllabusJobRunner.start_processing_job(
            db=db_session,
            syllabus_id=syllabus.id,
            version_id=version.id,
            user_id=user_a.id,
            run_async=False,
        )

        assert job.status == "completed"

        # Check that runtime tables were NOT touched
        assert db_session.query(Subject).count() == runtime_subjects_before
        assert db_session.query(LearningModule).count() == runtime_modules_before
        assert db_session.query(Lesson).count() == runtime_lessons_before
        assert db_session.query(PracticeSet).count() == runtime_practices_before

        # Check version state
        db_session.refresh(version)
        assert version.processing_status == "completed"
        assert version.curriculum_status == "review_required"
        assert version.is_active is False

        # Check that draft tables DO contain the draft
        draft = db_session.query(SyllabusCurriculumDraft).filter(
            SyllabusCurriculumDraft.syllabus_version_id == version.id
        ).first()
        assert draft is not None
        assert draft.status == "review_required"
        assert len(draft.subjects) == 1
        assert draft.subjects[0].name == "Operating Systems Principles"

    finally:
        if os.path.exists("backend/data/storage/test_os.txt"):
            os.remove("backend/data/storage/test_os.txt")


def test_draft_endpoints_and_cross_user_isolation(client: TestClient, db_session: Session, test_users):
    """
    Tests REST API endpoints:
    - POST /api/v1/syllabi/{syllabus_id}/versions/{version_id}/process
    - GET /api/v1/syllabi/{syllabus_id}/versions/{version_id}/processing
    - GET /api/v1/syllabi/{syllabus_id}/versions/{version_id}/draft
    - Enforces that User B receives 404 when attempting to access User A's draft.
    """
    user_a, user_b = test_users

    # Setup syllabus with existing draft
    syl = Syllabus(
        id="syl-api-test-01",
        user_id=user_a.id,
        title="Computer Networks",
        academic_level="Undergraduate",
        status="uploaded",
    )
    db_session.add(syl)

    ver = SyllabusVersion(
        id="ver-api-test-01",
        syllabus_id=syl.id,
        version_number=1,
        source_filename="networks.txt",
        storage_path="backend/data/storage/networks.txt",
        status="uploaded",
        processing_status="completed",
        curriculum_status="review_required",
        is_active=False,
    )
    db_session.add(ver)

    draft = SyllabusCurriculumDraft(
        id="draft-api-test-01",
        syllabus_version_id=ver.id,
        syllabus_id=syl.id,
        user_id=user_a.id,
        title="Computer Networks",
        academic_level="Undergraduate",
        overall_confidence="high",
        status="review_required",
    )
    db_session.add(draft)

    subj = SyllabusDraftSubject(
        id="subj-api-test-01",
        draft_id=draft.id,
        name="Computer Networks",
        code="CS401",
        credits="45 Periods",
        source_page=1,
        evidence_text="Page 1: 'CS401 Computer Networks'",
        confidence="high",
        sort_order=1,
    )
    db_session.add(subj)

    mod = SyllabusDraftModule(
        id="mod-api-test-01",
        draft_subject_id=subj.id,
        title="Network Layer",
        display_label="Unit 3",
        source_page=1,
        evidence_text="Page 1: 'Unit 3: Network Layer'",
        confidence="high",
        sort_order=3,
    )
    db_session.add(mod)

    top = SyllabusDraftTopic(
        id="top-api-test-01",
        draft_module_id=mod.id,
        title="IP Addressing and Routing Algorithms",
        source_page=1,
        evidence_text="Page 1: 'IP Addressing and Routing'",
        confidence="high",
        sort_order=1,
    )
    db_session.add(top)

    out = SyllabusDraftOutcome(
        id="out-api-test-01",
        draft_subject_id=subj.id,
        outcome_type="course_outcome",
        description="CO3: Design subnets and configure routing algorithms",
        source_page=2,
        evidence_text="Page 2: 'CO3'",
        confidence="high",
        sort_order=3,
    )
    db_session.add(out)
    db_session.commit()

    token_a = SecurityContext.create_test_jwt(user_id=user_a.id, email=user_a.email)
    token_b = SecurityContext.create_test_jwt(user_id=user_b.id, email=user_b.email)
    headers_user_a = {"Authorization": f"Bearer {token_a}"}
    headers_user_b = {"Authorization": f"Bearer {token_b}"}

    # 1. User A fetches draft
    res_a = client.get(
        f"/api/v1/syllabi/{syl.id}/versions/{ver.id}/draft",
        headers=headers_user_a,
    )
    assert res_a.status_code == 200
    data_a = res_a.json()
    assert data_a["id"] == draft.id
    assert data_a["status"] == "review_required"
    assert len(data_a["subjects"]) == 1
    assert data_a["subjects"][0]["code"] == "CS401"
    assert len(data_a["subjects"][0]["modules"]) == 1
    assert data_a["subjects"][0]["modules"][0]["title"] == "Network Layer"
    assert len(data_a["subjects"][0]["modules"][0]["topics"]) == 1
    assert len(data_a["subjects"][0]["outcomes"]) == 1

    # 2. User B cannot access User A's draft (Isolation)
    res_b = client.get(
        f"/api/v1/syllabi/{syl.id}/versions/{ver.id}/draft",
        headers=headers_user_b,
    )
    assert res_b.status_code == 404

    # 3. User B cannot trigger processing on User A's syllabus
    res_b_post = client.post(
        f"/api/v1/syllabi/{syl.id}/versions/{ver.id}/process",
        headers=headers_user_b,
        json={"force_reprocess": True},
    )
    assert res_b_post.status_code == 404
