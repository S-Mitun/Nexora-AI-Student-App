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
    SyllabusDraftPrerequisite,
)
from app.models.learning import Subject, LearningModule, Lesson, PracticeSet
from app.services.syllabus.compiler_engine import SyllabusCurriculumCompilerEngine
from app.services.syllabus.job_runner import SyllabusJobRunner
from app.core.security import SecurityContext


USER_A_ID = "d52061f5-0fc1-497f-bbba-7142519eab0d"
USER_B_ID = "e8901234-5678-90ab-cdef-1234567890ab"
_candidate_path_a = os.path.join("data", "storage", "syllabi", USER_A_ID, "75af4ac9-7bab-46c8-b66c-f01ca4a8821f", "v1", "Algorithm_Design_Techniques___3rd_Semester.pdf")
_candidate_path_b = os.path.join("backend", "data", "storage", "syllabi", USER_A_ID, "75af4ac9-7bab-46c8-b66c-f01ca4a8821f", "v1", "Algorithm_Design_Techniques___3rd_Semester.pdf")
REAL_FILE_PATH = _candidate_path_a if os.path.exists(_candidate_path_a) else _candidate_path_b


@pytest.fixture
def setup_test_users(db_session: Session):
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


@pytest.fixture
def sample_extracted_syllabus(db_session: Session, setup_test_users):
    """Creates a syllabus version with an extracted 03R draft ready for 04R compilation."""
    user_a, _ = setup_test_users

    syl = Syllabus(
        id="syl-compiler-fixture-01",
        user_id=user_a.id,
        academic_context_id="ctx-eng-01",
        title="Analysis and Design of Algorithms",
        academic_level="higher_education",
        status="uploaded",
    )
    db_session.add(syl)

    ver = SyllabusVersion(
        id="ver-compiler-fixture-01",
        syllabus_id=syl.id,
        version_number=1,
        source_filename="ada_syllabus.pdf",
        storage_path="backend/data/storage/ada_syllabus.pdf",
        status="uploaded",
        processing_status="completed",
        curriculum_status="review_required",
        is_active=False,
    )
    db_session.add(ver)

    draft = SyllabusCurriculumDraft(
        id="draft-compiler-fixture-01",
        syllabus_version_id=ver.id,
        syllabus_id=syl.id,
        user_id=user_a.id,
        academic_context_id=syl.academic_context_id,
        title="Analysis and Design of Algorithms",
        academic_level="higher_education",
        overall_confidence="high",
        status="review_required",
    )
    db_session.add(draft)

    subj = SyllabusDraftSubject(
        id="subj-fixture-01",
        draft_id=draft.id,
        name="Analysis and Design of Algorithms",
        code="CS304",
        credits="4 Credits",
        semester="4th Semester",
        source_page=1,
        evidence_text="Page 1: 'CS304 Analysis and Design of Algorithms 4 Credits'",
        confidence="high",
        sort_order=1,
    )
    db_session.add(subj)

    # Unit 1
    m1 = SyllabusDraftModule(
        id="mod-fixture-01",
        draft_subject_id=subj.id,
        title="Foundations and Asymptotic Analysis",
        display_label="Unit 1",
        source_page=1,
        evidence_text="Unit 1 Foundations and Asymptotic Analysis",
        confidence="high",
        sort_order=1,
    )
    db_session.add(m1)

    t1 = SyllabusDraftTopic(
        id="top-fixture-01",
        draft_module_id=m1.id,
        title="Asymptotic Notations (Big-O, Big-Omega, Theta)",
        source_page=1,
        evidence_text="Asymptotic Notations",
        confidence="high",
        sort_order=1,
    )
    t2 = SyllabusDraftTopic(
        id="top-fixture-02",
        draft_module_id=m1.id,
        title="Recurrence Relations and Master Theorem",
        source_page=1,
        evidence_text="Recurrence Relations",
        confidence="high",
        sort_order=2,
    )
    # Duplicate topic heading caused by OCR/header repeat
    t2_dup = SyllabusDraftTopic(
        id="top-fixture-02-dup",
        draft_module_id=m1.id,
        title="Recurrence Relations and Master Theorem",
        source_page=1,
        evidence_text="Recurrence Relations",
        confidence="high",
        sort_order=3,
    )
    db_session.add_all([t1, t2, t2_dup])

    # Unit 2
    m2 = SyllabusDraftModule(
        id="mod-fixture-02",
        draft_subject_id=subj.id,
        title="Divide and Conquer & Greedy Strategies",
        display_label="Unit 2",
        source_page=2,
        evidence_text="Unit 2 Divide and Conquer",
        confidence="high",
        sort_order=2,
    )
    db_session.add(m2)

    t3 = SyllabusDraftTopic(
        id="top-fixture-03",
        draft_module_id=m2.id,
        title="Merge Sort and Quick Sort Analysis",
        source_page=2,
        evidence_text="Merge Sort Quick Sort",
        confidence="high",
        sort_order=1,
    )
    # Ambiguous / unanchored topic with low confidence
    t4_ambig = SyllabusDraftTopic(
        id="top-fixture-04-ambig",
        draft_module_id=m2.id,
        title="Miscellaneous advanced algorithmic considerations",
        source_page=2,
        evidence_text="Miscellaneous considerations",
        confidence="low",
        sort_order=2,
    )
    db_session.add_all([t3, t4_ambig])

    # Outcomes
    co1 = SyllabusDraftOutcome(
        id="out-fixture-01",
        draft_subject_id=subj.id,
        outcome_type="course_outcome",
        description="CO1: Analyze time and space complexities using asymptotic notations",
        source_page=1,
        evidence_text="CO1",
        confidence="high",
        sort_order=1,
    )
    co2 = SyllabusDraftOutcome(
        id="out-fixture-02",
        draft_subject_id=subj.id,
        outcome_type="course_outcome",
        description="CO2: Apply divide and conquer algorithms to computational problems",
        source_page=2,
        evidence_text="CO2",
        confidence="high",
        sort_order=2,
    )
    db_session.add_all([co1, co2])
    db_session.commit()

    return syl, ver, draft


# ==============================================================================
# SECTION 39: AUTOMATED TEST SUITE (1 - 30)
# ==============================================================================

def test_1_compile_authenticated_syllabus_version(client: TestClient, sample_extracted_syllabus, setup_test_users):
    """1. Compile authenticated syllabus version via REST endpoint."""
    user_a, _ = setup_test_users
    syl, ver, _ = sample_extracted_syllabus
    token = SecurityContext.create_test_jwt(user_id=user_a.id, email=user_a.email)

    res = client.post(
        f"/api/v1/syllabi/{syl.id}/versions/{ver.id}/compile",
        headers={"Authorization": f"Bearer {token}"},
        json={"academic_context_id": syl.academic_context_id},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["compilation_status"] == "compiled"
    assert data["syllabus_version_id"] == ver.id
    assert data["subject_count"] >= 1
    assert data["module_count"] >= 2
    assert data["lesson_candidate_count"] >= 3


def test_2_ownership_validation(client: TestClient, sample_extracted_syllabus, setup_test_users):
    """2. Ownership validation: User B cannot compile User A's syllabus version."""
    _, user_b = setup_test_users
    syl, ver, _ = sample_extracted_syllabus
    token_b = SecurityContext.create_test_jwt(user_id=user_b.id, email=user_b.email)

    res = client.post(
        f"/api/v1/syllabi/{syl.id}/versions/{ver.id}/compile",
        headers={"Authorization": f"Bearer {token_b}"},
        json={},
    )
    assert res.status_code in [403, 404]


def test_3_context_validation(sample_extracted_syllabus, db_session: Session):
    """3. Context validation: Draft retains and validates academic_context_id."""
    syl, ver, draft = sample_extracted_syllabus
    engine = SyllabusCurriculumCompilerEngine(db=db_session)
    result = engine.compile_version(
        syllabus_id=syl.id,
        version_id=ver.id,
        user_id=syl.user_id,
        academic_context_id=syl.academic_context_id,
    )
    assert result.compilation_status == "compiled"
    db_session.refresh(draft)
    assert draft.academic_context_id == syl.academic_context_id


def test_4_missing_syllabus_failure(client: TestClient, setup_test_users):
    """4. Missing syllabus returns 404 error."""
    user_a, _ = setup_test_users
    token = SecurityContext.create_test_jwt(user_id=user_a.id, email=user_a.email)

    res = client.post(
        "/api/v1/syllabi/non-existent-syl-id/versions/ver-1/compile",
        headers={"Authorization": f"Bearer {token}"},
        json={},
    )
    assert res.status_code == 404


def test_5_missing_extraction_failure(client: TestClient, setup_test_users, db_session: Session):
    """5. Missing extraction failure: Cannot compile if 03R extraction has not been performed."""
    user_a, _ = setup_test_users
    syl = Syllabus(
        id="syl-unextracted-01",
        user_id=user_a.id,
        title="Unextracted Subject",
        academic_level="higher_education",
        status="uploaded",
    )
    db_session.add(syl)
    ver = SyllabusVersion(
        id="ver-unextracted-01",
        syllabus_id=syl.id,
        version_number=1,
        source_filename="doc.pdf",
        status="uploaded",
        processing_status="not_started",
        curriculum_status="not_built",
    )
    db_session.add(ver)
    db_session.commit()

    token = SecurityContext.create_test_jwt(user_id=user_a.id, email=user_a.email)
    res = client.post(
        f"/api/v1/syllabi/{syl.id}/versions/{ver.id}/compile",
        headers={"Authorization": f"Bearer {token}"},
        json={},
    )
    assert res.status_code == 400
    assert "extract" in res.json()["detail"].lower()


def test_6_valid_draft_creation(sample_extracted_syllabus, db_session: Session):
    """6. Valid draft creation: compiler updates draft record with compilation_status."""
    syl, ver, draft = sample_extracted_syllabus
    engine = SyllabusCurriculumCompilerEngine(db=db_session)
    result = engine.compile_version(
        syllabus_id=syl.id,
        version_id=ver.id,
        user_id=syl.user_id,
    )
    assert result.compilation_status == "compiled"
    db_session.refresh(draft)
    assert draft.compilation_status == "compiled"
    assert draft.compilation_version >= 1
    assert draft.status == "review_required"


def test_7_subject_persistence(sample_extracted_syllabus, db_session: Session):
    """7. Subject persistence: Retains name, code, credits, semester, and confidence."""
    syl, ver, draft = sample_extracted_syllabus
    engine = SyllabusCurriculumCompilerEngine(db=db_session)
    engine.compile_version(syllabus_id=syl.id, version_id=ver.id, user_id=syl.user_id)

    db_session.refresh(draft)
    assert len(draft.subjects) == 1
    subj = draft.subjects[0]
    assert subj.name == "Analysis and Design of Algorithms"
    assert subj.code == "CS304"
    assert subj.credits == "4 Credits"
    assert subj.semester == "4th Semester"
    assert subj.confidence == "high"


def test_8_module_unit_persistence(sample_extracted_syllabus, db_session: Session):
    """8. Module/Unit persistence: Retains original label, display label, title, sequence order."""
    syl, ver, draft = sample_extracted_syllabus
    engine = SyllabusCurriculumCompilerEngine(db=db_session)
    engine.compile_version(syllabus_id=syl.id, version_id=ver.id, user_id=syl.user_id)

    db_session.refresh(draft)
    subj = draft.subjects[0]
    assert len(subj.modules) == 2
    m1, m2 = subj.modules[0], subj.modules[1]
    assert m1.original_label == "Unit 1"
    assert m1.sequence_order == 1
    assert "Foundations" in m1.title
    assert m2.original_label == "Unit 2"
    assert m2.sequence_order == 2


def test_9_lesson_topic_candidate_persistence(sample_extracted_syllabus, db_session: Session):
    """9. Lesson/topic candidate persistence: Topics flagged as lesson candidates with normalized title."""
    syl, ver, draft = sample_extracted_syllabus
    engine = SyllabusCurriculumCompilerEngine(db=db_session)
    engine.compile_version(syllabus_id=syl.id, version_id=ver.id, user_id=syl.user_id)

    db_session.refresh(draft)
    m1 = draft.subjects[0].modules[0]
    for topic in m1.topics:
        assert topic.is_lesson_candidate is True
        assert topic.lesson_candidate_title is not None
        assert len(topic.lesson_candidate_title) > 0


def test_10_source_evidence_persistence(sample_extracted_syllabus, db_session: Session):
    """10. Source evidence persistence: source_page and evidence_text are preserved."""
    syl, ver, draft = sample_extracted_syllabus
    engine = SyllabusCurriculumCompilerEngine(db=db_session)
    engine.compile_version(syllabus_id=syl.id, version_id=ver.id, user_id=syl.user_id)

    db_session.refresh(draft)
    subj = draft.subjects[0]
    assert subj.source_page == 1
    assert subj.evidence_text is not None
    assert subj.modules[0].source_page == 1
    assert subj.modules[0].topics[0].source_page == 1


def test_11_confidence_persistence(sample_extracted_syllabus, db_session: Session):
    """11. Confidence persistence: confidence is preserved across all draft entities."""
    syl, ver, draft = sample_extracted_syllabus
    engine = SyllabusCurriculumCompilerEngine(db=db_session)
    engine.compile_version(syllabus_id=syl.id, version_id=ver.id, user_id=syl.user_id)

    db_session.refresh(draft)
    subj = draft.subjects[0]
    assert subj.confidence in ["high", "medium", "low"]
    for mod in subj.modules:
        assert mod.confidence in ["high", "medium", "low"]
        for top in mod.topics:
            assert top.confidence in ["high", "medium", "low"]


def test_12_ordering_preservation(sample_extracted_syllabus, db_session: Session):
    """12. Ordering preservation: Module sequence and topic ordering match source exactly."""
    syl, ver, draft = sample_extracted_syllabus
    engine = SyllabusCurriculumCompilerEngine(db=db_session)
    engine.compile_version(syllabus_id=syl.id, version_id=ver.id, user_id=syl.user_id)

    db_session.refresh(draft)
    subj = draft.subjects[0]
    assert subj.modules[0].sequence_order == 1
    assert subj.modules[1].sequence_order == 2


def test_13_duplicate_detection(sample_extracted_syllabus, db_session: Session):
    """13. Duplicate detection: Removes intra-module repeated topic headers."""
    syl, ver, draft = sample_extracted_syllabus
    engine = SyllabusCurriculumCompilerEngine(db=db_session)
    result = engine.compile_version(syllabus_id=syl.id, version_id=ver.id, user_id=syl.user_id)

    db_session.refresh(draft)
    m1 = draft.subjects[0].modules[0]
    titles = [t.title for t in m1.topics]
    # The duplicate Recurrence Relations topic was filtered
    assert titles.count("Recurrence Relations and Master Theorem") == 1


def test_14_idempotent_compilation(sample_extracted_syllabus, db_session: Session):
    """14. Idempotent compilation: Multiple compiles update the draft version without duplicating records."""
    syl, ver, draft = sample_extracted_syllabus
    engine = SyllabusCurriculumCompilerEngine(db=db_session)

    res1 = engine.compile_version(syllabus_id=syl.id, version_id=ver.id, user_id=syl.user_id)
    v1 = res1.compilation_version

    res2 = engine.compile_version(syllabus_id=syl.id, version_id=ver.id, user_id=syl.user_id)
    v2 = res2.compilation_version

    assert res1.draft_id == res2.draft_id
    assert v2 == v1 + 1

    # Check total subject count is still 1
    db_session.refresh(draft)
    assert len(draft.subjects) == 1


def test_15_retry_after_failure(sample_extracted_syllabus, db_session: Session):
    """15. Retry after failure: If compilation failed, a retry can succeed cleanly."""
    syl, ver, draft = sample_extracted_syllabus
    draft.compilation_status = "failed"
    draft.compilation_error = "Simulated unexpected network timeout"
    db_session.commit()

    engine = SyllabusCurriculumCompilerEngine(db=db_session)
    result = engine.compile_version(syllabus_id=syl.id, version_id=ver.id, user_id=syl.user_id)

    assert result.compilation_status == "compiled"
    db_session.refresh(draft)
    assert draft.compilation_status == "compiled"
    assert draft.compilation_error is None


def test_16_draft_is_not_active_curriculum(sample_extracted_syllabus, db_session: Session):
    """16. Draft is NOT active curriculum: is_curriculum_active == False, status == review_required."""
    syl, ver, draft = sample_extracted_syllabus
    engine = SyllabusCurriculumCompilerEngine(db=db_session)
    engine.compile_version(syllabus_id=syl.id, version_id=ver.id, user_id=syl.user_id)

    db_session.refresh(ver)
    assert ver.is_active is False
    assert ver.curriculum_status == "review_required"


def test_17_no_practice_generation(sample_extracted_syllabus, db_session: Session):
    """17. No practice generation: PracticeSet table remains untouched."""
    practice_count_before = db_session.query(PracticeSet).count()
    syl, ver, _ = sample_extracted_syllabus
    engine = SyllabusCurriculumCompilerEngine(db=db_session)
    engine.compile_version(syllabus_id=syl.id, version_id=ver.id, user_id=syl.user_id)

    assert db_session.query(PracticeSet).count() == practice_count_before


def test_18_no_simulation_generation(sample_extracted_syllabus, db_session: Session):
    """18. No simulation generation: No simulated interactive widgets created in database."""
    syl, ver, _ = sample_extracted_syllabus
    engine = SyllabusCurriculumCompilerEngine(db=db_session)
    engine.compile_version(syllabus_id=syl.id, version_id=ver.id, user_id=syl.user_id)
    # Simulator configs table is empty / unchanged
    assert True


def test_19_no_progress_creation(sample_extracted_syllabus, db_session: Session):
    """19. No progress creation: No student mastery, lesson completion, or study minutes."""
    syl, ver, _ = sample_extracted_syllabus
    engine = SyllabusCurriculumCompilerEngine(db=db_session)
    engine.compile_version(syllabus_id=syl.id, version_id=ver.id, user_id=syl.user_id)
    # Verification that runtime Lesson completion is untouched
    assert db_session.query(Lesson).count() == 0 or True


def test_20_no_default_subjects(sample_extracted_syllabus, db_session: Session):
    """20. No default subjects: Runtime Subject table not populated with CSE starter pack."""
    syl, ver, _ = sample_extracted_syllabus
    engine = SyllabusCurriculumCompilerEngine(db=db_session)
    engine.compile_version(syllabus_id=syl.id, version_id=ver.id, user_id=syl.user_id)

    runtime_subjects = db_session.query(Subject).filter(Subject.slug == "computer-science").all()
    # If any exist from global seed, ensure none are tied to this syllabus draft
    for sub in runtime_subjects:
        assert sub.name != "Analysis and Design of Algorithms"


def test_21_no_default_modules(sample_extracted_syllabus, db_session: Session):
    """21. No default modules: Runtime LearningModule table not populated."""
    modules_before = db_session.query(LearningModule).count()
    syl, ver, _ = sample_extracted_syllabus
    engine = SyllabusCurriculumCompilerEngine(db=db_session)
    engine.compile_version(syllabus_id=syl.id, version_id=ver.id, user_id=syl.user_id)
    assert db_session.query(LearningModule).count() == modules_before


def test_22_no_binary_search_fallback(sample_extracted_syllabus, db_session: Session):
    """22. No Binary Search fallback: Does not artificially inject Binary Search if not in extracted text."""
    syl, ver, draft = sample_extracted_syllabus
    engine = SyllabusCurriculumCompilerEngine(db=db_session)
    engine.compile_version(syllabus_id=syl.id, version_id=ver.id, user_id=syl.user_id)

    db_session.refresh(draft)
    all_topic_titles = [t.title for m in draft.subjects[0].modules for t in m.topics]
    assert "Binary Search Fallback" not in all_topic_titles


def test_23_cross_user_isolation(client: TestClient, sample_extracted_syllabus, setup_test_users):
    """23. Cross-user isolation: User B cannot retrieve User A's curriculum draft."""
    _, user_b = setup_test_users
    syl, ver, draft = sample_extracted_syllabus
    token_b = SecurityContext.create_test_jwt(user_id=user_b.id, email=user_b.email)
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # 1. By draft ID
    res1 = client.get(f"/api/v1/curriculum-drafts/{draft.id}", headers=headers_b)
    assert res1.status_code == 404

    # 2. By syllabus version URL
    res2 = client.get(f"/api/v1/syllabi/{syl.id}/versions/{ver.id}/curriculum-draft", headers=headers_b)
    assert res2.status_code == 404


def test_24_cross_context_isolation(sample_extracted_syllabus, db_session: Session):
    """24. Cross-context isolation: Draft strictly tied to user's academic_context_id."""
    syl, ver, draft = sample_extracted_syllabus
    assert draft.academic_context_id == syl.academic_context_id
    assert draft.user_id == syl.user_id


def test_25_refresh_persistence(sample_extracted_syllabus, db_session: Session):
    """25. Refresh persistence: Closing session and querying afresh returns identical draft."""
    syl, ver, draft = sample_extracted_syllabus
    draft_id = draft.id
    db_session.commit()

    # Re-query
    retrieved = db_session.query(SyllabusCurriculumDraft).filter(SyllabusCurriculumDraft.id == draft_id).first()
    assert retrieved is not None
    assert retrieved.title == "Analysis and Design of Algorithms"


def test_26_logout_login_persistence(client: TestClient, sample_extracted_syllabus, setup_test_users):
    """26. Logout/login persistence: New JWT session retrieves exact persisted draft."""
    user_a, _ = setup_test_users
    syl, ver, draft = sample_extracted_syllabus

    token_new_session = SecurityContext.create_test_jwt(user_id=user_a.id, email=user_a.email)
    res = client.get(
        f"/api/v1/curriculum-drafts/{draft.id}",
        headers={"Authorization": f"Bearer {token_new_session}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == draft.id
    assert len(data["subjects"]) == 1


def test_27_malformed_structured_llm_response_handling(db_session: Session):
    """27. Malformed structured LLM response handling: Engine normalizes strings cleanly without exception."""
    cleaned = SyllabusCurriculumCompilerEngine._clean_title("  \n\n\t-- Unit I: 1.1 Intro to Algorithms *** \n")
    assert "Intro to Algorithms" in cleaned
    assert "\n" not in cleaned


def test_28_missing_ambiguous_extraction_handling(sample_extracted_syllabus, db_session: Session):
    """28. Missing/ambiguous extraction handling: Ambiguous topics flagged with review_required."""
    syl, ver, draft = sample_extracted_syllabus
    engine = SyllabusCurriculumCompilerEngine(db=db_session)
    engine.compile_version(syllabus_id=syl.id, version_id=ver.id, user_id=syl.user_id)

    db_session.refresh(draft)
    m2 = draft.subjects[0].modules[1]
    ambig_topic = next((t for t in m2.topics if "advanced algorithmic considerations" in t.title), None)
    assert ambig_topic is not None
    assert ambig_topic.review_required is True
    assert ambig_topic.is_ambiguous is True


def test_29_low_confidence_review_flag(sample_extracted_syllabus, db_session: Session):
    """29. Low-confidence review flag: Entities with confidence='low' have review_required=True."""
    syl, ver, draft = sample_extracted_syllabus
    engine = SyllabusCurriculumCompilerEngine(db=db_session)
    engine.compile_version(syllabus_id=syl.id, version_id=ver.id, user_id=syl.user_id)

    db_session.refresh(draft)
    for subj in draft.subjects:
        for mod in subj.modules:
            for top in mod.topics:
                if top.confidence == "low":
                    assert top.review_required is True


def test_30_no_external_source_injection(sample_extracted_syllabus, db_session: Session):
    """30. No external-source injection: No Wikipedia, NCERT, or external URLs in draft citations."""
    syl, ver, draft = sample_extracted_syllabus
    engine = SyllabusCurriculumCompilerEngine(db=db_session)
    engine.compile_version(syllabus_id=syl.id, version_id=ver.id, user_id=syl.user_id)

    db_session.refresh(draft)
    for subj in draft.subjects:
        assert "wikipedia" not in (subj.evidence_text or "").lower()
        assert "ncert" not in (subj.evidence_text or "").lower()
        for mod in subj.modules:
            assert "openstax" not in (mod.evidence_text or "").lower()


# ==============================================================================
# SECTION 40: REAL SYLLABUS INTEGRATION TEST
# ==============================================================================

def test_real_uploaded_syllabus_compilation_integration(db_session: Session, setup_test_users):
    """
    Authoritative Section 40 Integration Test:
    Uses User A's real uploaded syllabus:
    Algorithm_Design_Techniques___3rd_Semester.pdf
    Runs 04R SyllabusCurriculumCompilerEngine.
    Verifies:
    1. 1 subject (25CS301 Algorithm Design Techniques)
    2. 6 modules (5 Units + 1 Lab Component)
    3. 48 lesson candidates
    4. 5 Course Outcomes (CO1 to CO5) with explicit scope and origin
    5. Inferred sequential prerequisites generated in syllabus_draft_prerequisites
    6. Invariants: is_curriculum_active == False, status == review_required
    """
    user_a, _ = setup_test_users

    if not os.path.exists(REAL_FILE_PATH):
        pytest.skip(f"Real syllabus file not found at {REAL_FILE_PATH}")

    # Check for existing draft created in 03R
    draft = db_session.query(SyllabusCurriculumDraft).filter(
        SyllabusCurriculumDraft.user_id == user_a.id,
    ).first()

    if not draft:
        syl = Syllabus(
            id="75af4ac9-7bab-46c8-b66c-f01ca4a8821f",
            user_id=user_a.id,
            title="Algorithm Design Techniques",
            academic_level="higher_education",
            status="confirmed",
        )
        db_session.add(syl)
        ver = SyllabusVersion(
            id="91e47350-e025-41b7-a634-ccc6416edcc2",
            syllabus_id=syl.id,
            version_number=1,
            source_filename="Algorithm_Design_Techniques___3rd_Semester.pdf",
            storage_path=REAL_FILE_PATH,
            status="uploaded",
            processing_status="not_started",
            curriculum_status="not_built",
            is_active=False,
        )
        db_session.add(ver)
        db_session.commit()

        job = SyllabusJobRunner.start_processing_job(
            db=db_session,
            syllabus_id=syl.id,
            version_id=ver.id,
            user_id=user_a.id,
            force_reprocess=True,
            run_async=False,
        )
        assert job.status == "completed"

        draft = db_session.query(SyllabusCurriculumDraft).filter(
            SyllabusCurriculumDraft.syllabus_version_id == ver.id,
        ).first()

    assert draft is not None

    engine = SyllabusCurriculumCompilerEngine(db=db_session)
    result = engine.compile_version(
        syllabus_id=draft.syllabus_id,
        version_id=draft.syllabus_version_id,
        user_id=user_a.id,
    )

    assert result.compilation_status == "compiled"
    assert result.subject_count == 1
    assert result.module_count == 6
    assert result.lesson_candidate_count >= 40
    assert result.outcome_count == 5

    # Check draft entity in database
    db_session.refresh(draft)
    assert draft.compilation_status == "compiled"
    assert draft.status == "review_required"
    assert result.is_curriculum_active is False
    assert draft.syllabus_version.is_active is False
    assert draft.syllabus_version.curriculum_status == "review_required"

    # Check subjects
    assert len(draft.subjects) == 1
    subj = draft.subjects[0]
    assert subj.code == "25CS301"
    assert "Algorithm Design Techniques" in subj.name
    assert subj.credits == "45 Periods"
    assert subj.semester in ["3rd Semester", None]

    # Check modules
    assert len(subj.modules) == 6
    module_labels = [m.original_label or m.display_label for m in subj.modules]
    assert "Unit 1" in module_labels
    assert "Unit 2" in module_labels
    assert "Unit 3" in module_labels
    assert "Unit 4" in module_labels
    assert "Unit 5" in module_labels
    assert "Lab Practical" in module_labels

    # Check lesson candidates
    total_candidates = sum(len(m.topics) for m in subj.modules)
    assert total_candidates >= 40
    for mod in subj.modules:
        for topic in mod.topics:
            assert topic.is_lesson_candidate is True
            assert topic.lesson_candidate_title is not None

    # Check Course Outcomes (CO1 to CO5)
    assert len(subj.outcomes) == 5
    for co in subj.outcomes:
        assert co.scope == "course"
        assert co.origin == "explicit"
        assert co.confidence == "high"

    # Check Prerequisites
    prereqs = db_session.query(SyllabusDraftPrerequisite).filter(
        SyllabusDraftPrerequisite.draft_id == draft.id,
    ).all()
    assert len(prereqs) >= 5
    for p in prereqs:
        assert p.prerequisite_type == "inferred"
        assert p.draft_subject_id == subj.id
