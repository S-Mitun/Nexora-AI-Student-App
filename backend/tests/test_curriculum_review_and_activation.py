import pytest
from fastapi import HTTPException
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
)
from app.models.learning import Subject, LearningModule, Lesson, StudentSubject, Topic, Concept
from app.services.syllabus.activation_service import SyllabusCurriculumActivationService
from app.services.syllabus.state_resolver import SyllabusStateResolver
from app.core.security import SecurityContext
from app.schemas.syllabus import (
    SyllabusDraftCorrectionRequest,
    SyllabusDraftSubjectCorrection,
    SyllabusDraftModuleCorrection,
    SyllabusDraftTopicCorrection,
    SyllabusCurriculumActivateRequest,
)


USER_1_ID = "d52061f5-0fc1-497f-bbba-7142519eab0d"
USER_2_ID = "e8901234-5678-90ab-cdef-1234567890ab"
CTX_1 = "ctx-engineering-05r"
CTX_2 = "ctx-arts-05r"


@pytest.fixture
def setup_users(db_session: Session):
    u1 = db_session.query(UserProfile).filter(UserProfile.id == USER_1_ID).first()
    if not u1:
        u1 = UserProfile(
            id=USER_1_ID,
            email="user1@nexora.edu",
            full_name="User One",
            education_level="higher_education",
            degree="B.Tech Computer Science",
        )
        db_session.add(u1)

    u2 = db_session.query(UserProfile).filter(UserProfile.id == USER_2_ID).first()
    if not u2:
        u2 = UserProfile(
            id=USER_2_ID,
            email="user2@nexora.edu",
            full_name="User Two",
            education_level="higher_education",
            degree="B.A. English",
        )
        db_session.add(u2)

    db_session.commit()
    token1 = SecurityContext.create_test_jwt(user_id=u1.id, email=u1.email)
    token2 = SecurityContext.create_test_jwt(user_id=u2.id, email=u2.email)
    return {"u1": u1, "u2": u2, "token1": token1, "token2": token2}


@pytest.fixture
def sample_draft(db_session: Session, setup_users):
    """Creates a sample syllabus, version, and structured draft ready for review and activation."""
    u1 = setup_users["u1"]

    syl = Syllabus(
        id="syl-05r-test-01",
        user_id=u1.id,
        academic_context_id=CTX_1,
        title="Analysis and Design of Algorithms",
        academic_level="higher_education",
        status="uploaded",
    )
    db_session.add(syl)

    ver = SyllabusVersion(
        id="ver-05r-test-01",
        syllabus_id=syl.id,
        version_number=1,
        source_filename="ada_syllabus.pdf",
        status="uploaded",
        processing_status="completed",
        curriculum_status="review_required",
        is_active=False,
    )
    db_session.add(ver)

    draft = SyllabusCurriculumDraft(
        id="draft-05r-test-01",
        syllabus_version_id=ver.id,
        syllabus_id=syl.id,
        user_id=u1.id,
        academic_context_id=CTX_1,
        title="Analysis and Design of Algorithms",
        academic_level="higher_education",
        overall_confidence="high",
        status="review_required",
        compilation_version=1,
    )
    db_session.add(draft)

    d_subj = SyllabusDraftSubject(
        id="dsubj-01",
        draft_id=draft.id,
        name="Analysis and Design of Algorithms",
        code="CS301",
        credits="4",
        semester="Semester 3",
        source_page=1,
        evidence_text="CS301: Analysis and Design of Algorithms, 4 Credits",
        confidence="high",
        sort_order=0,
        is_excluded=False,
    )
    db_session.add(d_subj)

    d_mod1 = SyllabusDraftModule(
        id="dmod-01",
        draft_subject_id=d_subj.id,
        title="Introduction and Divide-and-Conquer",
        display_label="Unit 1",
        original_label="UNIT I",
        sequence_order=1,
        source_page=1,
        evidence_text="UNIT I: Introduction, Asymptotic notations, Divide and Conquer",
        confidence="high",
        sort_order=0,
        is_excluded=False,
    )
    db_session.add(d_mod1)

    d_top1 = SyllabusDraftTopic(
        id="dtop-01",
        draft_module_id=d_mod1.id,
        title="Asymptotic Notations",
        lesson_candidate_title="Asymptotic Notations and Growth of Functions",
        is_lesson_candidate=True,
        source_page=1,
        confidence="high",
        sort_order=0,
        is_excluded=False,
    )
    d_top2 = SyllabusDraftTopic(
        id="dtop-02",
        draft_module_id=d_mod1.id,
        title="Divide and Conquer Approach",
        lesson_candidate_title="Divide and Conquer: Recurrences and Master Theorem",
        is_lesson_candidate=True,
        source_page=1,
        confidence="high",
        sort_order=1,
        is_excluded=False,
    )
    db_session.add_all([d_top1, d_top2])

    d_mod2 = SyllabusDraftModule(
        id="dmod-02",
        draft_subject_id=d_subj.id,
        title="Dynamic Programming and Greedy Algorithms",
        display_label="Unit 2",
        original_label="UNIT II",
        sequence_order=2,
        source_page=2,
        evidence_text="UNIT II: Dynamic Programming, Greedy Strategy",
        confidence="high",
        sort_order=1,
        is_excluded=False,
    )
    db_session.add(d_mod2)

    d_top3 = SyllabusDraftTopic(
        id="dtop-03",
        draft_module_id=d_mod2.id,
        title="Dynamic Programming Principles",
        lesson_candidate_title="Elements of Dynamic Programming",
        is_lesson_candidate=True,
        source_page=2,
        confidence="high",
        sort_order=0,
        is_excluded=False,
    )
    db_session.add(d_top3)

    db_session.commit()
    return syl, ver, draft, d_subj, [d_mod1, d_mod2], [d_top1, d_top2, d_top3]


class TestCurriculumReviewAndCorrections:
    """Test suite for Master Prompt 05R Draft Corrections and Persistence."""

    def test_save_draft_corrections_renaming_and_ordering(self, db_session: Session, sample_draft):
        syl, ver, draft, d_subj, modules, topics = sample_draft

        correction_req = SyllabusDraftCorrectionRequest(
            subjects=[
                SyllabusDraftSubjectCorrection(
                    id=d_subj.id,
                    name="Advanced Design of Algorithms (Refined)",
                    code="CS301-A",
                    credits="4.5",
                    semester="3rd Sem",
                    is_excluded=False,
                    sort_order=0,
                )
            ],
            modules=[
                SyllabusDraftModuleCorrection(
                    id=modules[0].id,
                    title="Divide and Conquer Paradigms",
                    display_label="Module 1",
                    is_excluded=False,
                    sort_order=1,
                ),
                SyllabusDraftModuleCorrection(
                    id=modules[1].id,
                    title="Greedy & Dynamic Programming",
                    display_label="Module 2",
                    is_excluded=False,
                    sort_order=0,
                ),
            ],
            topics=[
                SyllabusDraftTopicCorrection(
                    id=topics[0].id,
                    title="Big-O and Theta Notations",
                    lesson_candidate_title="Formal Asymptotic Notations",
                    is_lesson_candidate=True,
                    is_excluded=False,
                    sort_order=0,
                )
            ],
        )

        updated_draft = SyllabusCurriculumActivationService.save_draft_corrections(
            db=db_session,
            user_id=syl.user_id,
            syllabus_id=syl.id,
            version_id=ver.id,
            corrections=correction_req,
        )

        assert updated_draft.status == "changes_saved"
        assert updated_draft.subjects[0].name == "Advanced Design of Algorithms (Refined)"
        assert updated_draft.subjects[0].code == "CS301-A"

        # Verify database record directly
        db_session.expire_all()
        refreshed_subj = db_session.query(SyllabusDraftSubject).filter(SyllabusDraftSubject.id == d_subj.id).first()
        assert refreshed_subj.name == "Advanced Design of Algorithms (Refined)"

        refreshed_mod1 = db_session.query(SyllabusDraftModule).filter(SyllabusDraftModule.id == modules[0].id).first()
        assert refreshed_mod1.title == "Divide and Conquer Paradigms"
        assert refreshed_mod1.display_label == "Module 1"

        refreshed_top1 = db_session.query(SyllabusDraftTopic).filter(SyllabusDraftTopic.id == topics[0].id).first()
        assert refreshed_top1.title == "Big-O and Theta Notations"
        assert refreshed_top1.lesson_candidate_title == "Formal Asymptotic Notations"

    def test_save_draft_corrections_exclusion_toggle(self, db_session: Session, sample_draft):
        syl, ver, draft, d_subj, modules, topics = sample_draft

        # Exclude module 2 and topic 2
        correction_req = SyllabusDraftCorrectionRequest(
            subjects=[],
            modules=[
                SyllabusDraftModuleCorrection(
                    id=modules[1].id,
                    is_excluded=True,
                )
            ],
            topics=[
                SyllabusDraftTopicCorrection(
                    id=topics[1].id,
                    is_excluded=True,
                )
            ],
        )

        SyllabusCurriculumActivationService.save_draft_corrections(
            db=db_session,
            user_id=syl.user_id,
            syllabus_id=syl.id,
            version_id=ver.id,
            corrections=correction_req,
        )

        db_session.expire_all()
        mod2 = db_session.query(SyllabusDraftModule).filter(SyllabusDraftModule.id == modules[1].id).first()
        assert mod2.is_excluded is True

        top2 = db_session.query(SyllabusDraftTopic).filter(SyllabusDraftTopic.id == topics[1].id).first()
        assert top2.is_excluded is True

    def test_save_draft_corrections_validation_blank_name_rejected(self, db_session: Session, sample_draft):
        syl, ver, draft, d_subj, _, _ = sample_draft

        correction_req = SyllabusDraftCorrectionRequest(
            subjects=[
                SyllabusDraftSubjectCorrection(
                    id=d_subj.id,
                    name="   ",  # Blank name should be rejected
                )
            ],
            modules=[],
            topics=[],
        )

        with pytest.raises(HTTPException) as exc_info:
            SyllabusCurriculumActivationService.save_draft_corrections(
                db=db_session,
                user_id=syl.user_id,
                syllabus_id=syl.id,
                version_id=ver.id,
                corrections=correction_req,
            )
        assert exc_info.value.status_code in [400, 422]
        assert "blank" in str(exc_info.value.detail).lower() or "cannot be empty" in str(exc_info.value.detail).lower()

    def test_save_draft_corrections_unauthorized_user_rejected(self, db_session: Session, sample_draft):
        syl, ver, draft, d_subj, _, _ = sample_draft

        # USER_2 tries to modify USER_1's draft
        with pytest.raises(HTTPException) as exc_info:
            SyllabusCurriculumActivationService.save_draft_corrections(
                db=db_session,
                user_id=USER_2_ID,
                syllabus_id=syl.id,
                version_id=ver.id,
                corrections=SyllabusDraftCorrectionRequest(subjects=[], modules=[], topics=[]),
            )
        assert exc_info.value.status_code == 404


class TestActivationEligibility:
    """Test suite for Activation Eligibility Verification."""

    def test_activation_eligibility_success(self, db_session: Session, sample_draft):
        syl, ver, draft, _, _, _ = sample_draft
        eligibility = SyllabusCurriculumActivationService.validate_activation_eligibility(
            db=db_session,
            user_id=syl.user_id,
            syllabus_id=syl.id,
            version_id=ver.id,
        )

        assert eligibility.is_eligible is True
        assert eligibility.subject_count == 1
        assert eligibility.module_count == 2
        assert eligibility.topic_count == 3
        assert eligibility.is_already_active is False

    def test_activation_eligibility_all_subjects_excluded(self, db_session: Session, sample_draft):
        syl, ver, draft, d_subj, _, _ = sample_draft

        # Mark subject excluded
        d_subj.is_excluded = True
        db_session.commit()

        eligibility = SyllabusCurriculumActivationService.validate_activation_eligibility(
            db=db_session,
            user_id=syl.user_id,
            syllabus_id=syl.id,
            version_id=ver.id,
        )

        assert eligibility.is_eligible is False
        assert any("no active subjects" in r.lower() for r in eligibility.reasons)


class TestExplicitCurriculumActivation:
    """Test suite for Atomic Activation, Entity Creation, and Supersession."""

    def test_atomic_activation_creates_runtime_entities(self, db_session: Session, sample_draft):
        syl, ver, draft, d_subj, modules, topics = sample_draft

        # Exclude topic 2 before activating to verify exclusions are respected
        topics[1].is_excluded = True
        db_session.commit()

        res = SyllabusCurriculumActivationService.activate_curriculum(
            db=db_session,
            user_id=syl.user_id,
            syllabus_id=syl.id,
            version_id=ver.id,
            target_context_id=CTX_1,
        )

        assert res.status == "active"
        assert res.curriculum_status == "active"
        assert res.is_curriculum_active is True
        assert res.subjects_activated == 1
        assert res.modules_activated == 2
        # 3 topics total, 1 excluded -> 2 topics activated
        assert res.topics_activated == 2
        assert res.lessons_activated == 2

        # Verify database entities directly
        db_session.expire_all()

        # 1. Subject record created and active
        runtime_subj = db_session.query(Subject).filter(Subject.syllabus_version_id == ver.id).first()
        assert runtime_subj is not None
        assert runtime_subj.name == d_subj.name
        assert runtime_subj.syllabus_version_id == ver.id
        assert runtime_subj.is_active is True

        # 2. Topics created under runtime subject
        runtime_topics = db_session.query(Topic).filter(Topic.subject_id == runtime_subj.id).all()
        assert len(runtime_topics) == 2

        # 3. Lessons created (excluding the excluded topic)
        runtime_lessons = (
            db_session.query(Lesson)
            .join(LearningModule, Lesson.module_id == LearningModule.id)
            .join(Concept, LearningModule.concept_id == Concept.id)
            .join(Topic, Concept.topic_id == Topic.id)
            .filter(Topic.subject_id == runtime_subj.id)
            .all()
        )
        assert len(runtime_lessons) == 2
        lesson_titles = [l.title for l in runtime_lessons]
        assert topics[0].lesson_candidate_title in lesson_titles
        assert topics[1].lesson_candidate_title not in lesson_titles

        # 4. StudentSubject created for student auto-enrollment
        enrollment = (
            db_session.query(StudentSubject)
            .filter(
                StudentSubject.user_id == syl.user_id,
                StudentSubject.subject_id == runtime_subj.id,
            )
            .first()
        )
        assert enrollment is not None

        # 5. Status updates persisted
        refreshed_draft = db_session.query(SyllabusCurriculumDraft).filter(SyllabusCurriculumDraft.id == draft.id).first()
        assert refreshed_draft.status == "approved"

        refreshed_ver = db_session.query(SyllabusVersion).filter(SyllabusVersion.id == ver.id).first()
        assert refreshed_ver.is_active is True
        assert refreshed_ver.curriculum_status == "active"

        refreshed_syl = db_session.query(Syllabus).filter(Syllabus.id == syl.id).first()
        assert refreshed_syl.status == "active"

    def test_activation_idempotency_duplicate_call(self, db_session: Session, sample_draft):
        syl, ver, draft, _, _, _ = sample_draft

        res1 = SyllabusCurriculumActivationService.activate_curriculum(
            db=db_session,
            user_id=syl.user_id,
            syllabus_id=syl.id,
            version_id=ver.id,
            target_context_id=CTX_1,
        )
        assert res1.is_curriculum_active is True

        # Calling again on already active curriculum succeeds idempotently without duplicating subjects
        res2 = SyllabusCurriculumActivationService.activate_curriculum(
            db=db_session,
            user_id=syl.user_id,
            syllabus_id=syl.id,
            version_id=ver.id,
            target_context_id=CTX_1,
        )
        assert res2.is_curriculum_active is True
        assert "already active" in res2.message.lower()

        runtime_subjs = db_session.query(Subject).filter(Subject.syllabus_version_id == ver.id).all()
        assert len(runtime_subjs) == 1

    def test_activation_supersession_archives_previous_version(self, db_session: Session, sample_draft):
        syl, ver1, draft1, d_subj1, _, _ = sample_draft

        # First activate v1
        SyllabusCurriculumActivationService.activate_curriculum(
            db=db_session,
            user_id=syl.user_id,
            syllabus_id=syl.id,
            version_id=ver1.id,
            target_context_id=CTX_1,
        )

        # Now create v2 for the same syllabus and context
        ver2 = SyllabusVersion(
            id="ver-05r-test-02",
            syllabus_id=syl.id,
            version_number=2,
            source_filename="ada_syllabus_v2.pdf",
            status="uploaded",
            processing_status="completed",
            curriculum_status="review_required",
            is_active=False,
        )
        db_session.add(ver2)

        draft2 = SyllabusCurriculumDraft(
            id="draft-05r-test-02",
            syllabus_version_id=ver2.id,
            syllabus_id=syl.id,
            user_id=syl.user_id,
            academic_context_id=CTX_1,
            title="Analysis and Design of Algorithms v2",
            academic_level="higher_education",
            overall_confidence="high",
            status="review_required",
        )
        db_session.add(draft2)

        d_subj2 = SyllabusDraftSubject(
            id="dsubj-02",
            draft_id=draft2.id,
            name="Analysis and Design of Algorithms (2026 Revised)",
            code="CS301-R",
            credits="4",
            sort_order=0,
            is_excluded=False,
        )
        db_session.add(d_subj2)

        d_mod2 = SyllabusDraftModule(
            id="dmod-02-v2",
            draft_subject_id=d_subj2.id,
            title="Modern Algorithmic Paradigms",
            display_label="Unit 1",
            sequence_order=1,
            sort_order=0,
            is_excluded=False,
        )
        db_session.add(d_mod2)

        d_top2 = SyllabusDraftTopic(
            id="dtop-02-v2",
            draft_module_id=d_mod2.id,
            title="Quantum & Randomized Algorithms",
            lesson_candidate_title="Randomized Algorithms",
            is_lesson_candidate=True,
            sort_order=0,
            is_excluded=False,
        )
        db_session.add(d_top2)
        db_session.commit()

        # Activate v2
        res_v2 = SyllabusCurriculumActivationService.activate_curriculum(
            db=db_session,
            user_id=syl.user_id,
            syllabus_id=syl.id,
            version_id=ver2.id,
            target_context_id=CTX_1,
        )

        assert res_v2.is_curriculum_active is True
        assert res_v2.version_id == ver2.id

        db_session.expire_all()

        # Verify v1 was soft-archived without data deletion
        refreshed_v1 = db_session.query(SyllabusVersion).filter(SyllabusVersion.id == ver1.id).first()
        assert refreshed_v1.is_active is False
        assert refreshed_v1.curriculum_status == "archived"

        # Previous v1 subjects soft-deactivated
        subjs_v1 = db_session.query(Subject).filter(Subject.syllabus_version_id == ver1.id).all()
        assert all(s.is_active is False for s in subjs_v1)

        # New v2 is active
        refreshed_v2 = db_session.query(SyllabusVersion).filter(SyllabusVersion.id == ver2.id).first()
        assert refreshed_v2.is_active is True
        assert refreshed_v2.curriculum_status == "active"

        subjs_v2 = db_session.query(Subject).filter(Subject.syllabus_version_id == ver2.id).all()
        assert all(s.is_active is True for s in subjs_v2)


class TestCanonicalStateTransitions:
    """Test suite for Canonical Syllabus-State Resolver in Prompt 05R."""

    def test_canonical_state_resolver_state_c_to_state_d(self, db_session: Session, sample_draft):
        syl, ver, draft, _, _, _ = sample_draft

        # State C: review_required
        state_c = SyllabusStateResolver.resolve_state(db_session, syl.user_id, CTX_1)
        assert state_c.has_syllabus is True
        assert state_c.is_curriculum_active is False
        assert state_c.curriculum_status == "review_required"
        assert state_c.has_draft is True

        # Activate
        SyllabusCurriculumActivationService.activate_curriculum(
            db=db_session,
            user_id=syl.user_id,
            syllabus_id=syl.id,
            version_id=ver.id,
            target_context_id=CTX_1,
        )

        # State D: active
        state_d = SyllabusStateResolver.resolve_state(db_session, syl.user_id, CTX_1)
        assert state_d.has_syllabus is True
        assert state_d.is_curriculum_active is True
        assert state_d.curriculum_status == "active"
        assert state_d.current_version_id == ver.id


class TestCurriculumActivationAPIEndpoints:
    """API Integration tests for 05R endpoints via TestClient."""

    def test_api_activation_eligibility(self, client: TestClient, sample_draft, setup_users):
        syl, ver, _, _, _, _ = sample_draft
        headers = {"Authorization": f"Bearer {setup_users['token1']}"}

        response = client.get(
            f"/api/v1/syllabi/{syl.id}/versions/{ver.id}/activation-eligibility",
            headers=headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["is_eligible"] is True
        assert data["subject_count"] == 1
        assert data["module_count"] == 2
        assert data["topic_count"] == 3

    def test_api_save_draft_corrections(self, client: TestClient, sample_draft, setup_users):
        syl, ver, _, d_subj, _, _ = sample_draft
        headers = {"Authorization": f"Bearer {setup_users['token1']}"}

        payload = {
            "subjects": [
                {
                    "id": d_subj.id,
                    "name": "Algorithms and Data Structures (Updated)",
                    "code": "CS-301X",
                    "is_excluded": False,
                    "sort_order": 0,
                }
            ],
            "modules": [],
            "topics": [],
        }

        response = client.put(
            f"/api/v1/syllabi/{syl.id}/versions/{ver.id}/draft",
            json=payload,
            headers=headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "changes_saved"
        assert data["subjects"][0]["name"] == "Algorithms and Data Structures (Updated)"

    def test_api_activate_curriculum_success(self, client: TestClient, sample_draft, setup_users):
        syl, ver, _, _, _, _ = sample_draft
        headers = {"Authorization": f"Bearer {setup_users['token1']}"}

        payload = {
            "confirm_activation": True,
            "academic_context_id": CTX_1,
        }

        response = client.post(
            f"/api/v1/syllabi/{syl.id}/versions/{ver.id}/activate-curriculum",
            json=payload,
            headers=headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "active"
        assert data["curriculum_status"] == "active"
        assert data["is_curriculum_active"] is True
        assert data["subjects_activated"] == 1
        assert data["lessons_activated"] == 3

    def test_api_activate_curriculum_unconfirmed_rejected(self, client: TestClient, sample_draft, setup_users):
        syl, ver, _, _, _, _ = sample_draft
        headers = {"Authorization": f"Bearer {setup_users['token1']}"}

        payload = {
            "confirm_activation": False,  # Must be confirmed explicitly
        }

        response = client.post(
            f"/api/v1/syllabi/{syl.id}/versions/{ver.id}/activate-curriculum",
            json=payload,
            headers=headers,
        )
        assert response.status_code == 400
        assert "confirmation" in response.json()["detail"].lower()

    def test_api_cross_user_activation_forbidden(self, client: TestClient, sample_draft, setup_users):
        syl, ver, _, _, _, _ = sample_draft
        # USER 2 attempts to activate USER 1's syllabus
        headers = {"Authorization": f"Bearer {setup_users['token2']}"}

        payload = {
            "confirm_activation": True,
        }

        response = client.post(
            f"/api/v1/syllabi/{syl.id}/versions/{ver.id}/activate-curriculum",
            json=payload,
            headers=headers,
        )
        assert response.status_code == 404
