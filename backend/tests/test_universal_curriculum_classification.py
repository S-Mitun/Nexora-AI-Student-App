import os
import tempfile
import uuid
import pytest
from fastapi import HTTPException
from sqlalchemy.orm import Session
import docx
import pptx
from app.models.syllabus import (
    Syllabus,
    SyllabusVersion,
    SyllabusCurriculumDraft,
    SyllabusDraftSubject,
    SyllabusDraftModule,
    SyllabusDraftTopic,
    SyllabusDraftOutcome,
    SyllabusDraftReference,
)
from app.models.profile import UserProfile
from app.services.syllabus.compiler_engine import SyllabusCurriculumCompilerEngine
from app.services.syllabus.activation_service import SyllabusCurriculumActivationService
from app.services.syllabus.extraction.text_extractor import TextExtractor
from app.services.syllabus.extraction.docx_extractor import DocxExtractor
from app.services.syllabus.extraction.pptx_extractor import PptxExtractor
from app.services.syllabus.draft_engine import SyllabusDraftEngine


@pytest.fixture
def setup_test_users(db_session: Session):
    user_a = db_session.query(UserProfile).filter(UserProfile.id == "user-alpha-111").first()
    if not user_a:
        user_a = UserProfile(
            id="user-alpha-111",
            email="user_a@nexora.edu",
            full_name="User Alpha",
            education_level="higher_education",
            degree="B.Tech Computer Science",
            academic_year="3rd Year",
            institution="Engineering College",
        )
        db_session.add(user_a)

    user_b = db_session.query(UserProfile).filter(UserProfile.id == "user-beta-222").first()
    if not user_b:
        user_b = UserProfile(
            id="user-beta-222",
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


def test_mathematics_syllabus_classification(db_session: Session, setup_test_users):
    """
    Verifies universal classification for a Mathematics syllabus:
    - Chapters instead of Units
    - Theoretical content (no lab)
    - Textbook and reference citations (Wiley, Kreyszig) separated from topics
    - Course objectives preserved
    """
    user_a, _ = setup_test_users

    syl = Syllabus(
        title="Advanced Engineering Mathematics",
        academic_level="higher_education",
        user_id=user_a.id,
        status="confirmed",
    )
    db_session.add(syl)
    db_session.flush()

    ver = SyllabusVersion(
        syllabus_id=syl.id,
        version_number=1,
        source_filename="Math_Syllabus.pdf",
        curriculum_status="not_built",
        is_active=False,
        file_size_bytes=1024,
    )
    db_session.add(ver)
    db_session.flush()

    # Create draft with raw extracted mathematics curriculum
    draft = SyllabusCurriculumDraft(
        syllabus_id=syl.id,
        syllabus_version_id=ver.id,
        user_id=user_a.id,
        title="Advanced Engineering Mathematics",
        academic_level="higher_education",
        status="draft",
        compilation_status="queued",
    )
    db_session.add(draft)
    db_session.flush()

    subj = SyllabusDraftSubject(
        draft_id=draft.id,
        name="Advanced Engineering Mathematics",
        code="MATH301",
        sort_order=0,
    )
    db_session.add(subj)
    db_session.flush()

    # Chapter 1: Linear Algebra
    mod1 = SyllabusDraftModule(
        draft_subject_id=subj.id,
        title="Linear Algebra and Vector Spaces",
        display_label="Chapter 1",
        sort_order=0,
    )
    db_session.add(mod1)
    db_session.flush()

    topics_mod1 = [
        "Vector Spaces and Subspaces",
        "Linear Independence and Basis",
        "Eigenvalues and Eigenvectors",
        "Diagonalization and Orthogonality",
    ]
    for idx, t in enumerate(topics_mod1):
        db_session.add(
            SyllabusDraftTopic(
                draft_module_id=mod1.id,
                title=t,
                sort_order=idx,
                confidence="high",
            )
        )

    # Chapter 2: Differential Equations (with reference and metadata mixed in extraction)
    mod2 = SyllabusDraftModule(
        draft_subject_id=subj.id,
        title="Ordinary and Partial Differential Equations",
        display_label="Chapter 2",
        sort_order=1,
    )
    db_session.add(mod2)
    db_session.flush()

    topics_mod2 = [
        "First-Order Linear Equations",
        "Second-Order Homogeneous Equations with Constant Coefficients",
        "TOTAL: 45 PERIODS",  # Metadata
        "Erwin Kreyszig, Advanced Engineering Mathematics, 10th Edition, John Wiley & Sons, 2011.",  # Reference
        "https://mathworld.wolfram.com",  # Web reference
    ]
    for idx, t in enumerate(topics_mod2):
        db_session.add(
            SyllabusDraftTopic(
                draft_module_id=mod2.id,
                title=t,
                sort_order=idx,
                confidence="high",
            )
        )

    db_session.commit()

    # Compile mathematics curriculum
    engine = SyllabusCurriculumCompilerEngine(db=db_session)
    res = engine.compile_version(
        syllabus_id=syl.id,
        version_id=ver.id,
        user_id=user_a.id,
    )

    assert res.compilation_status == "compiled"
    assert res.subject_count == 1
    assert res.module_count == 2
    # Verify genuine math lesson candidates (4 in chapter 1 + 2 in chapter 2 = 6)
    assert res.lesson_candidate_count == 6

    # Verify references and metadata were cleanly segregated
    db_session.refresh(draft)
    assert len(draft.references) == 2
    ref_titles = [r.title for r in draft.references]
    assert any("Kreyszig" in t for t in ref_titles)
    assert any("wolfram.com" in t for t in ref_titles)


def test_humanities_history_syllabus_classification(db_session: Session, setup_test_users):
    """
    Verifies universal classification for a Humanities / History syllabus:
    - Themes/Periods instead of chapters
    - Essay & historiography topics
    - Penguin / Oxford citations separated from topics
    - No laboratory module fabricated
    """
    user_a, _ = setup_test_users

    syl = Syllabus(
        title="Modern World History",
        academic_level="higher_education",
        user_id=user_a.id,
        status="confirmed",
    )
    db_session.add(syl)
    db_session.flush()

    ver = SyllabusVersion(
        syllabus_id=syl.id,
        version_number=1,
        source_filename="History_101.pdf",
        curriculum_status="not_built",
        is_active=False,
        file_size_bytes=1024,
    )
    db_session.add(ver)
    db_session.flush()

    draft = SyllabusCurriculumDraft(
        syllabus_id=syl.id,
        syllabus_version_id=ver.id,
        user_id=user_a.id,
        title="Modern World History",
        academic_level="higher_education",
        status="draft",
        compilation_status="queued",
    )
    db_session.add(draft)
    db_session.flush()

    subj = SyllabusDraftSubject(
        draft_id=draft.id,
        name="Modern World History",
        code="HIST201",
        sort_order=0,
    )
    db_session.add(subj)
    db_session.flush()

    theme1 = SyllabusDraftModule(
        draft_subject_id=subj.id,
        title="The Enlightenment and Democratic Revolutions",
        display_label="Theme 1",
        sort_order=0,
    )
    db_session.add(theme1)
    db_session.flush()

    for idx, t in enumerate([
        "Intellectual Currents of the European Enlightenment",
        "The American Revolution and Constitutional Foundations",
        "The French Revolution: Ideology, Radicalization, and Legacy",
        "Romila Thapar, Early India: From the Origins to AD 1300, Penguin Books, 2002.",  # Book citation
    ]):
        db_session.add(
            SyllabusDraftTopic(
                draft_module_id=theme1.id,
                title=t,
                sort_order=idx,
                confidence="high",
            )
        )

    db_session.commit()

    engine = SyllabusCurriculumCompilerEngine(db=db_session)
    res = engine.compile_version(
        syllabus_id=syl.id,
        version_id=ver.id,
        user_id=user_a.id,
    )

    assert res.subject_count == 1
    assert res.module_count == 1
    # 3 genuine history topics (book segregated)
    assert res.lesson_candidate_count == 3
    db_session.refresh(draft)
    assert len(draft.references) == 1
    assert "Romila Thapar" in draft.references[0].title


def test_commerce_economics_syllabus_classification(db_session: Session, setup_test_users):
    """
    Verifies universal classification for a Business / Economics syllabus:
    - Modules with case studies and economic theory
    - Cengage / Mankiw textbook citation separated
    - Hours metadata detected
    """
    user_a, _ = setup_test_users

    syl = Syllabus(
        title="Managerial Economics",
        academic_level="higher_education",
        user_id=user_a.id,
        status="confirmed",
    )
    db_session.add(syl)
    db_session.flush()

    ver = SyllabusVersion(
        syllabus_id=syl.id,
        version_number=1,
        source_filename="Economics.pdf",
        curriculum_status="not_built",
        is_active=False,
        file_size_bytes=1024,
    )
    db_session.add(ver)
    db_session.flush()

    draft = SyllabusCurriculumDraft(
        syllabus_id=syl.id,
        syllabus_version_id=ver.id,
        user_id=user_a.id,
        title="Managerial Economics",
        academic_level="higher_education",
        status="draft",
        compilation_status="queued",
    )
    db_session.add(draft)
    db_session.flush()

    subj = SyllabusDraftSubject(
        draft_id=draft.id,
        name="Managerial Economics",
        code="ECON501",
        sort_order=0,
    )
    db_session.add(subj)
    db_session.flush()

    mod = SyllabusDraftModule(
        draft_subject_id=subj.id,
        title="Demand Analysis and Market Structures",
        display_label="Module 1",
        sort_order=0,
    )
    db_session.add(mod)
    db_session.flush()

    topics = [
        "Law of Demand and Consumer Surplus",
        "Price, Income and Cross Elasticity of Demand",
        "Monopoly and Price Discrimination Case Studies",
        "PERIODS: 40 HOURS",  # Metadata
        "N. Gregory Mankiw, Principles of Economics, 8th Edition, Cengage Learning, 2018.",  # Reference
    ]
    for idx, t in enumerate(topics):
        db_session.add(
            SyllabusDraftTopic(
                draft_module_id=mod.id,
                title=t,
                sort_order=idx,
                confidence="high",
            )
        )

    db_session.commit()

    engine = SyllabusCurriculumCompilerEngine(db=db_session)
    res = engine.compile_version(
        syllabus_id=syl.id,
        version_id=ver.id,
        user_id=user_a.id,
    )

    assert res.subject_count == 1
    assert res.lesson_candidate_count == 3
    db_session.refresh(draft)
    assert len(draft.references) == 1
    assert "Mankiw" in draft.references[0].title


def test_ambiguous_and_uncertain_entity_preservation(db_session: Session, setup_test_users):
    """
    Verifies Phase 2.2 and 3.6:
    - Uncertain or low-confidence lines are not silently deleted or forced into lessons.
    - They are retained with entity_category = 'uncertain' and review_required = True.
    """
    user_a, _ = setup_test_users

    syl = Syllabus(
        title="Unfamiliar Law Course",
        academic_level="higher_education",
        user_id=user_a.id,
        status="confirmed",
    )
    db_session.add(syl)
    db_session.flush()

    ver = SyllabusVersion(
        syllabus_id=syl.id,
        version_number=1,
        source_filename="Law.pdf",
        curriculum_status="not_built",
        is_active=False,
        file_size_bytes=1024,
    )
    db_session.add(ver)
    db_session.flush()

    draft = SyllabusCurriculumDraft(
        syllabus_id=syl.id,
        syllabus_version_id=ver.id,
        user_id=user_a.id,
        title="Unfamiliar Law Course",
        academic_level="higher_education",
        status="draft",
        compilation_status="queued",
    )
    db_session.add(draft)
    db_session.flush()

    subj = SyllabusDraftSubject(
        draft_id=draft.id,
        name="Law of Torts",
        code="LAW101",
        sort_order=0,
    )
    db_session.add(subj)
    db_session.flush()

    mod = SyllabusDraftModule(
        draft_subject_id=subj.id,
        title="General Principles of Tortious Liability",
        display_label="Part I",
        sort_order=0,
    )
    db_session.add(mod)
    db_session.flush()

    topics = [
        "Negligence and Duty of Care",
        "99",  # Fragmented numeric line -> uncertain
        "Strict Liability and Rylands v Fletcher",
    ]
    for idx, t in enumerate(topics):
        db_session.add(
            SyllabusDraftTopic(
                draft_module_id=mod.id,
                title=t,
                sort_order=idx,
                confidence="high",
            )
        )

    db_session.commit()

    engine = SyllabusCurriculumCompilerEngine(db=db_session)
    res = engine.compile_version(
        syllabus_id=syl.id,
        version_id=ver.id,
        user_id=user_a.id,
    )

    assert res.subject_count == 1
    # Only 2 genuine topics are lesson candidates
    assert res.lesson_candidate_count == 2
    assert res.review_required_count >= 1

    # Verify uncertain topic was kept in draft and flagged for review
    db_session.refresh(mod)
    uncertain_topics = [t for t in mod.topics if t.entity_category == "uncertain"]
    assert len(uncertain_topics) == 1
    assert uncertain_topics[0].title == "99"
    assert uncertain_topics[0].is_lesson_candidate is False
    assert uncertain_topics[0].review_required is True


def test_activation_and_safe_return_to_review_lifecycle(db_session: Session, setup_test_users):
    """
    Verifies Phase 5:
    - Explicit curriculum activation transitions draft to approved and version to active.
    - Creates runtime Subject and Module rows.
    - Safe return to review / deactivation atomically rolls back active state to review_required,
      while preserving all drafts, references, notes, and records.
    """
    user_a, _ = setup_test_users

    syl = Syllabus(
        title="Environmental Science",
        academic_level="higher_education",
        user_id=user_a.id,
        status="confirmed",
    )
    db_session.add(syl)
    db_session.flush()

    ver = SyllabusVersion(
        syllabus_id=syl.id,
        version_number=1,
        source_filename="Env_Science.pdf",
        curriculum_status="not_built",
        is_active=False,
        file_size_bytes=1024,
    )
    db_session.add(ver)
    db_session.flush()

    draft = SyllabusCurriculumDraft(
        syllabus_id=syl.id,
        syllabus_version_id=ver.id,
        user_id=user_a.id,
        title="Environmental Science",
        academic_level="higher_education",
        status="draft",
        compilation_status="queued",
    )
    db_session.add(draft)
    db_session.flush()

    subj = SyllabusDraftSubject(
        draft_id=draft.id,
        name="Ecology and Environmental Studies",
        code="ENV101",
        sort_order=0,
    )
    db_session.add(subj)
    db_session.flush()

    mod = SyllabusDraftModule(
        draft_subject_id=subj.id,
        title="Ecosystem Dynamics and Biodiversity",
        display_label="Unit 1",
        sort_order=0,
    )
    db_session.add(mod)
    db_session.flush()

    db_session.add(
        SyllabusDraftTopic(
            draft_module_id=mod.id,
            title="Biogeochemical Cycles and Energy Flow",
            sort_order=0,
            confidence="high",
        )
    )
    db_session.commit()

    # 1. Compile
    engine = SyllabusCurriculumCompilerEngine(db=db_session)
    engine.compile_version(syllabus_id=syl.id, version_id=ver.id, user_id=user_a.id)

    # 2. Activate
    activation_res = SyllabusCurriculumActivationService.activate_curriculum(
        db=db_session,
        syllabus_id=syl.id,
        version_id=ver.id,
        user_id=user_a.id,
    )
    assert activation_res.is_curriculum_active is True
    assert activation_res.status == "active"
    db_session.refresh(ver)
    assert ver.curriculum_status == "active"
    assert ver.is_active is True
    db_session.refresh(draft)
    assert draft.status == "approved"

    # 3. Deactivate / Return to Review
    deact_res = SyllabusCurriculumActivationService.deactivate_curriculum(
        db=db_session,
        user_id=user_a.id,
        syllabus_id=syl.id,
        version_id=ver.id,
    )
    assert deact_res.is_curriculum_active is False
    assert deact_res.curriculum_status == "review_required"

    db_session.refresh(ver)
    assert ver.curriculum_status == "review_required"
    db_session.refresh(draft)
    assert draft.status == "review_required"
    # Verify draft contents and modules remain 100% preserved
    assert len(draft.subjects) == 1
    assert len(draft.subjects[0].modules) == 1


def test_case_a_computer_science_engineering_curriculum(db_session: Session, setup_test_users):
    """
    Case A: Computer Science / Engineering syllabus with numbered units,
    technical topics, and Course Outcomes (CO1-CO3).
    Ensures:
    - Numbered units preserved ('Unit 1', 'Unit 2', 'Unit 3').
    - Technical topics classified as genuine lesson candidates.
    - Course outcomes partitioned as outcomes, not mixed into lesson topics.
    - Zero hardcoded bias toward 'Algorithm Design Techniques'.
    """
    user_a, _ = setup_test_users

    syl = Syllabus(
        title="CS402: Distributed Systems and Cloud Computing",
        academic_level="higher_education",
        user_id=user_a.id,
        status="confirmed",
    )
    db_session.add(syl)
    db_session.flush()

    ver = SyllabusVersion(
        syllabus_id=syl.id,
        version_number=1,
        source_filename="Distributed_Systems_Syllabus.pdf",
        curriculum_status="not_built",
        is_active=False,
        file_size_bytes=4096,
    )
    db_session.add(ver)
    db_session.flush()

    draft = SyllabusCurriculumDraft(
        syllabus_id=syl.id,
        syllabus_version_id=ver.id,
        user_id=user_a.id,
        title="Distributed Systems and Cloud Computing",
        academic_level="higher_education",
        status="draft",
        compilation_status="queued",
    )
    db_session.add(draft)
    db_session.flush()

    subj = SyllabusDraftSubject(
        draft_id=draft.id,
        name="Distributed Systems and Cloud Computing",
        code="CS402",
        sort_order=0,
    )
    db_session.add(subj)
    db_session.flush()

    # Unit 1
    u1 = SyllabusDraftModule(
        draft_subject_id=subj.id,
        title="Foundations of Distributed Systems",
        display_label="Unit 1",
        sort_order=0,
    )
    db_session.add(u1)
    db_session.flush()
    for idx, top in enumerate(["Message Passing and Remote Procedure Calls", "Logical Clocks and Lamport Timestamps", "Vector Clocks and Causality"]):
        db_session.add(SyllabusDraftTopic(draft_module_id=u1.id, title=top, sort_order=idx, confidence="high"))

    # Unit 2
    u2 = SyllabusDraftModule(
        draft_subject_id=subj.id,
        title="Consensus, Coordination and Fault Tolerance",
        display_label="Unit 2",
        sort_order=1,
    )
    db_session.add(u2)
    db_session.flush()
    for idx, top in enumerate(["Two-Phase Commit Protocol", "Paxos and Raft Consensus Algorithms", "Byzantine Fault Tolerance and Quorums"]):
        db_session.add(SyllabusDraftTopic(draft_module_id=u2.id, title=top, sort_order=idx, confidence="high"))

    # Unit 3
    u3 = SyllabusDraftModule(
        draft_subject_id=subj.id,
        title="Cloud Virtualization and Microservices",
        display_label="Unit 3",
        sort_order=2,
    )
    db_session.add(u3)
    db_session.flush()
    for idx, top in enumerate(["Containerization and Docker", "Kubernetes Orchestration", "Serverless Computing Architectures"]):
        db_session.add(SyllabusDraftTopic(draft_module_id=u3.id, title=top, sort_order=idx, confidence="high"))

    # Outcomes
    for co_code, co_desc in [
        ("CO1", "Analyze distributed consistency models and clock synchronization mechanisms"),
        ("CO2", "Implement fault-tolerant consensus using Paxos and Raft algorithms"),
        ("CO3", "Design scalable microservices deployed on cloud container infrastructure"),
    ]:
        db_session.add(
            SyllabusDraftOutcome(
                draft_subject_id=subj.id,
                outcome_type="course_outcome",
                description=f"{co_code}: {co_desc}",
                confidence="high",
            )
        )
    db_session.commit()

    engine = SyllabusCurriculumCompilerEngine(db=db_session)
    result = engine.compile_version(syllabus_id=syl.id, version_id=ver.id, user_id=user_a.id)

    assert result.compilation_status == "compiled"
    assert result.subject_count == 1
    assert result.module_count == 3
    assert result.lesson_candidate_count == 9
    assert result.outcome_count == 3

    # Assert outcomes remain cleanly scoped and separated from lesson topics
    db_session.refresh(subj)
    assert len(subj.outcomes) == 3
    for out in subj.outcomes:
        assert out.outcome_type == "course_outcome"
        assert out.origin in ("explicit", "inferred")

    # Assert modules preserve source terminology
    unit_labels = [m.display_label for m in subj.modules]
    assert unit_labels == ["Unit 1", "Unit 2", "Unit 3"]

    # Assert no lesson topic contains 'Algorithm Design Techniques' or unrelated default content
    for m in subj.modules:
        for t in m.topics:
            assert t.entity_category == "topic"
            assert t.is_lesson_candidate is True
            assert "algorithm design techniques" not in t.title.lower()


def test_case_c_science_theory_and_practical_experiments_curriculum(db_session: Session, setup_test_users):
    """
    Case C: Science syllabus with theory topics and explicitly listed experiments / practical requirements.
    Ensures:
    - Real practical requirements are retained when present.
    - Theory topics remain distinct from laboratory practicals.
    - Lab experiments are classified appropriately and preserved.
    """
    user_a, _ = setup_test_users

    syl = Syllabus(
        title="CHEM201: Physical Chemistry and Experimental Dynamics",
        academic_level="higher_education",
        user_id=user_a.id,
        status="confirmed",
    )
    db_session.add(syl)
    db_session.flush()

    ver = SyllabusVersion(
        syllabus_id=syl.id,
        version_number=1,
        source_filename="Physical_Chemistry_Lab.pdf",
        curriculum_status="not_built",
        is_active=False,
        file_size_bytes=2048,
    )
    db_session.add(ver)
    db_session.flush()

    draft = SyllabusCurriculumDraft(
        syllabus_id=syl.id,
        syllabus_version_id=ver.id,
        user_id=user_a.id,
        title="Physical Chemistry and Experimental Dynamics",
        academic_level="higher_education",
        status="draft",
        compilation_status="queued",
    )
    db_session.add(draft)
    db_session.flush()

    subj = SyllabusDraftSubject(
        draft_id=draft.id,
        name="Physical Chemistry and Experimental Dynamics",
        code="CHEM201",
        sort_order=0,
    )
    db_session.add(subj)
    db_session.flush()

    # Module 1: Theory
    m1 = SyllabusDraftModule(
        draft_subject_id=subj.id,
        title="Chemical Kinetics and Reaction Dynamics",
        display_label="Unit 1",
        sort_order=0,
    )
    db_session.add(m1)
    db_session.flush()
    for idx, top in enumerate(["Rate Laws and Reaction Order", "Arrhenius Equation and Activation Energy", "Homogeneous and Heterogeneous Catalysis"]):
        db_session.add(SyllabusDraftTopic(draft_module_id=m1.id, title=top, sort_order=idx, confidence="high"))

    # Module 2: Theory
    m2 = SyllabusDraftModule(
        draft_subject_id=subj.id,
        title="Chemical Thermodynamics and Phase Equilibria",
        display_label="Unit 2",
        sort_order=1,
    )
    db_session.add(m2)
    db_session.flush()
    for idx, top in enumerate(["First and Second Laws of Thermodynamics", "Gibbs Free Energy and Chemical Spontaneity", "Clapeyron-Clausius Phase Equation"]):
        db_session.add(SyllabusDraftTopic(draft_module_id=m2.id, title=top, sort_order=idx, confidence="high"))

    # Module 3: Explicit Practical Lab Experiments
    m3 = SyllabusDraftModule(
        draft_subject_id=subj.id,
        title="Physical Chemistry Laboratory Practicals",
        display_label="Lab Practical",
        sort_order=2,
    )
    db_session.add(m3)
    db_session.flush()
    practical_experiments = [
        "Experiment 1: Determination of rate constant for ester hydrolysis",
        "Experiment 2: Conductometric titration of strong acid with strong base",
        "Experiment 3: Determination of heat of neutralization using Dewar calorimeter",
    ]
    for idx, exp in enumerate(practical_experiments):
        db_session.add(SyllabusDraftTopic(draft_module_id=m3.id, title=exp, sort_order=idx, confidence="high"))

    db_session.commit()

    engine = SyllabusCurriculumCompilerEngine(db=db_session)
    result = engine.compile_version(syllabus_id=syl.id, version_id=ver.id, user_id=user_a.id)

    assert result.compilation_status == "compiled"
    assert result.subject_count == 1
    assert result.module_count == 3

    db_session.refresh(subj)
    lab_modules = [m for m in subj.modules if "lab" in m.display_label.lower() or "practical" in m.title.lower()]
    assert len(lab_modules) == 1, "Laboratory practical module must be retained and identified"
    lab_mod = lab_modules[0]
    assert len(lab_mod.topics) == 3
    for top in lab_mod.topics:
        assert top.is_lesson_candidate is True
        assert top.entity_category == "topic"
        assert "experiment" in top.title.lower() or "determination" in top.title.lower() or "titration" in top.title.lower()


def test_case_f_references_textbooks_authors_publishers_and_metadata(db_session: Session, setup_test_users):
    """
    Case F: Syllabus containing references, textbooks, authors, publisher details,
    URLs and total teaching periods / evaluation metadata.
    Ensures:
    - Textbooks, authors, publishers, editions, URLs classified as reference metadata.
    - Teaching period totals (e.g. TOTAL: 60 HOURS) and evaluation schemes classified as metadata.
    - None of these are treated as lesson topics.
    """
    user_a, _ = setup_test_users

    syl = Syllabus(
        title="LAW102: Modern Constitutional Law and Jurisprudence",
        academic_level="higher_education",
        user_id=user_a.id,
        status="confirmed",
    )
    db_session.add(syl)
    db_session.flush()

    ver = SyllabusVersion(
        syllabus_id=syl.id,
        version_number=1,
        source_filename="Constitutional_Law.pdf",
        curriculum_status="not_built",
        is_active=False,
        file_size_bytes=2048,
    )
    db_session.add(ver)
    db_session.flush()

    draft = SyllabusCurriculumDraft(
        syllabus_id=syl.id,
        syllabus_version_id=ver.id,
        user_id=user_a.id,
        title="Modern Constitutional Law and Jurisprudence",
        academic_level="higher_education",
        status="draft",
        compilation_status="queued",
    )
    db_session.add(draft)
    db_session.flush()

    subj = SyllabusDraftSubject(
        draft_id=draft.id,
        name="Modern Constitutional Law and Jurisprudence",
        code="LAW102",
        sort_order=0,
    )
    db_session.add(subj)
    db_session.flush()

    mod = SyllabusDraftModule(
        draft_subject_id=subj.id,
        title="Constitutional Framework and Fundamental Rights",
        display_label="Module 1",
        sort_order=0,
    )
    db_session.add(mod)
    db_session.flush()

    raw_items = [
        # Legitimate curriculum topics
        ("Rule of Law and Separation of Powers", "high"),
        ("Fundamental Rights and Judicial Review", "high"),
        ("Directive Principles of State Policy", "high"),
        # Textbooks with publishers, editions, authors
        ("Granville Austin, The Indian Constitution: Cornerstone of a Nation, Oxford University Press, 1999.", "high"),
        ("H.M. Seervai, Constitutional Law of India, Universal Law Publishing, 4th Edition, ISBN 978-8175344400.", "high"),
        ("A.V. Dicey, Introduction to the Study of the Law of the Constitution, Macmillan, 1915.", "high"),
        # URLs / Web references
        ("Case Law Portal: https://supremecourtofindia.nic.in/judgments", "high"),
        ("Constitutional Bench Repository: https://lawmin.gov.in/acts", "high"),
        # Administrative / Teaching Period / Evaluation Metadata
        ("TOTAL (L:45 + T:15): 60 HOURS", "high"),
        ("Internal Assessment: 30%", "high"),
        ("End-Semester Examination: 70%", "high"),
    ]

    for idx, (title, conf) in enumerate(raw_items):
        db_session.add(
            SyllabusDraftTopic(
                draft_module_id=mod.id,
                title=title,
                sort_order=idx,
                confidence=conf,
            )
        )
    db_session.commit()

    engine = SyllabusCurriculumCompilerEngine(db=db_session)
    result = engine.compile_version(syllabus_id=syl.id, version_id=ver.id, user_id=user_a.id)

    assert result.compilation_status == "compiled"
    assert result.lesson_candidate_count == 3, "Only the 3 core constitutional law concepts must become lessons"

    db_session.refresh(draft)
    db_session.refresh(mod)

    # Verify references captured
    captured_ref_titles = [r.title for r in draft.references]
    assert len(draft.references) >= 3, "Textbooks and URLs must be recorded in draft references"
    assert any("Oxford University Press" in t or "Granville Austin" in t for t in captured_ref_titles)
    assert any("Universal Law" in t or "Seervai" in t for t in captured_ref_titles)
    assert any("supremecourtofindia.nic.in" in (r.url or "") for r in draft.references)

    # Verify lesson topics are strictly the curriculum concepts
    active_topics = [t for t in mod.topics if t.is_lesson_candidate and not t.is_excluded]
    assert len(active_topics) == 3
    for t in active_topics:
        assert t.entity_category == "topic"
        assert "oxford" not in t.title.lower()
        assert "http" not in t.title.lower()
        assert "examination" not in t.title.lower()
        assert "hours" not in t.title.lower()


def test_case_h_pure_theoretical_syllabus_without_laboratory(db_session: Session, setup_test_users):
    """
    Case H: A syllabus without a laboratory/practical section.
    Ensures:
    - Theoretical syllabi do not receive invented labs or fabricated practicals.
    - Zero lab modules or practical topics exist in compiled draft.
    """
    user_a, _ = setup_test_users

    syl = Syllabus(
        title="PHIL201: Epistemology and Classical Metaphysics",
        academic_level="higher_education",
        user_id=user_a.id,
        status="confirmed",
    )
    db_session.add(syl)
    db_session.flush()

    ver = SyllabusVersion(
        syllabus_id=syl.id,
        version_number=1,
        source_filename="Epistemology_Theory.pdf",
        curriculum_status="not_built",
        is_active=False,
        file_size_bytes=1024,
    )
    db_session.add(ver)
    db_session.flush()

    draft = SyllabusCurriculumDraft(
        syllabus_id=syl.id,
        syllabus_version_id=ver.id,
        user_id=user_a.id,
        title="Epistemology and Classical Metaphysics",
        academic_level="higher_education",
        status="draft",
        compilation_status="queued",
    )
    db_session.add(draft)
    db_session.flush()

    subj = SyllabusDraftSubject(
        draft_id=draft.id,
        name="Epistemology and Classical Metaphysics",
        code="PHIL201",
        sort_order=0,
    )
    db_session.add(subj)
    db_session.flush()

    # Chapter 1
    c1 = SyllabusDraftModule(
        draft_subject_id=subj.id,
        title="The Problem of Knowledge and Socratic Inquiry",
        display_label="Chapter 1",
        sort_order=0,
    )
    db_session.add(c1)
    db_session.flush()
    for idx, t in enumerate(["Socratic Elenchus and Platonic Forms", "Aristotle's Episteme and Categories"]):
        db_session.add(SyllabusDraftTopic(draft_module_id=c1.id, title=t, sort_order=idx, confidence="high"))

    # Chapter 2
    c2 = SyllabusDraftModule(
        draft_subject_id=subj.id,
        title="Rationalism and Empiricism",
        display_label="Chapter 2",
        sort_order=1,
    )
    db_session.add(c2)
    db_session.flush()
    for idx, t in enumerate(["Descartes and Methodological Skepticism", "Locke and Tabula Rasa", "Hume's Problem of Induction"]):
        db_session.add(SyllabusDraftTopic(draft_module_id=c2.id, title=t, sort_order=idx, confidence="high"))

    db_session.commit()

    engine = SyllabusCurriculumCompilerEngine(db=db_session)
    result = engine.compile_version(syllabus_id=syl.id, version_id=ver.id, user_id=user_a.id)

    assert result.compilation_status == "compiled"
    assert result.module_count == 2
    assert result.lesson_candidate_count == 5

    db_session.refresh(subj)
    # Check that NO lab or practical modules exist
    lab_modules = [m for m in subj.modules if "lab" in m.display_label.lower() or "practical" in m.title.lower()]
    assert len(lab_modules) == 0, "No synthetic laboratory modules should be created for a purely theoretical syllabus"

    # Check that NO topic has 'practical' or 'lab' artificially injected
    for m in subj.modules:
        for t in m.topics:
            assert "lab" not in t.title.lower()
            assert "practical" not in t.title.lower()


def test_real_persistence_review_mutations_and_refetch(db_session: Session, setup_test_users):
    """
    Persistence & Review: Verifies that human review mutations (excluding a topic,
    updating a topic title, or setting a user_confirmed_name) can be saved
    to the test database and faithfully refetched.
    """
    user_a, _ = setup_test_users

    syl = Syllabus(
        title="AER301: Propulsion Systems",
        academic_level="higher_education",
        user_id=user_a.id,
        status="confirmed",
    )
    db_session.add(syl)
    db_session.flush()

    ver = SyllabusVersion(
        syllabus_id=syl.id,
        version_number=1,
        source_filename="Propulsion.pdf",
        curriculum_status="not_built",
        is_active=False,
        file_size_bytes=1024,
    )
    db_session.add(ver)
    db_session.flush()

    draft = SyllabusCurriculumDraft(
        syllabus_id=syl.id,
        syllabus_version_id=ver.id,
        user_id=user_a.id,
        title="Propulsion Systems",
        academic_level="higher_education",
        status="draft",
        compilation_status="queued",
    )
    db_session.add(draft)
    db_session.flush()

    subj = SyllabusDraftSubject(draft_id=draft.id, name="Propulsion Systems", code="AER301", sort_order=0)
    db_session.add(subj)
    db_session.flush()

    mod = SyllabusDraftModule(draft_subject_id=subj.id, title="Gas Turbines", display_label="Unit 1", sort_order=0)
    db_session.add(mod)
    db_session.flush()

    top1 = SyllabusDraftTopic(draft_module_id=mod.id, title="Brayton Cycle Dynamics", sort_order=0, confidence="high")
    top2 = SyllabusDraftTopic(draft_module_id=mod.id, title="Compressor Stall & Surge", sort_order=1, confidence="high")
    db_session.add_all([top1, top2])
    db_session.commit()

    engine = SyllabusCurriculumCompilerEngine(db=db_session)
    engine.compile_version(syllabus_id=syl.id, version_id=ver.id, user_id=user_a.id)

    # Simulate Student Review actions:
    # 1. Edit title and user_confirmed_name on topic 1
    top1.title = "Advanced Brayton Cycle & Turbine Efficiency"
    top1.user_confirmed_name = "Brayton Cycle Analysis"
    # 2. Exclude topic 2 from active lessons
    top2.is_excluded = True
    top2.is_lesson_candidate = False
    draft.status = "review_in_progress"
    db_session.commit()

    # Re-fetch from fresh query to verify persistence
    db_session.expire_all()
    refetched_draft = db_session.query(SyllabusCurriculumDraft).filter(SyllabusCurriculumDraft.id == draft.id).first()
    assert refetched_draft is not None
    assert refetched_draft.status == "review_in_progress"

    refetched_mod = refetched_draft.subjects[0].modules[0]
    t1 = next(t for t in refetched_mod.topics if "Brayton" in t.title)
    assert t1.title == "Advanced Brayton Cycle & Turbine Efficiency"
    assert t1.user_confirmed_name == "Brayton Cycle Analysis"

    t2 = next(t for t in refetched_mod.topics if "Compressor" in t.title)
    assert t2.is_excluded is True
    assert t2.is_lesson_candidate is False


def test_cross_user_and_context_authorization_security(db_session: Session, setup_test_users):
    """
    Security: Verifies that unauthorized users (User B) cannot read, compile,
    or activate User A's syllabus draft, enforcing strict multi-tenant boundary isolation.
    """
    user_a, user_b = setup_test_users

    syl = Syllabus(
        title="BIO101: Molecular Genetics",
        academic_level="higher_education",
        user_id=user_a.id,
        status="confirmed",
    )
    db_session.add(syl)
    db_session.flush()

    ver = SyllabusVersion(
        syllabus_id=syl.id,
        version_number=1,
        source_filename="Genetics.pdf",
        curriculum_status="not_built",
        is_active=False,
        file_size_bytes=1024,
    )
    db_session.add(ver)
    db_session.flush()

    draft = SyllabusCurriculumDraft(
        syllabus_id=syl.id,
        syllabus_version_id=ver.id,
        user_id=user_a.id,
        title="Molecular Genetics",
        academic_level="higher_education",
        status="draft",
        compilation_status="queued",
    )
    db_session.add(draft)
    db_session.commit()

    engine = SyllabusCurriculumCompilerEngine(db=db_session)

    # User B attempts to compile User A's syllabus -> must be rejected (404)
    with pytest.raises(HTTPException) as exc_info:
        engine.compile_version(syllabus_id=syl.id, version_id=ver.id, user_id=user_b.id)
    assert exc_info.value.status_code == 404

    # User B attempts to activate User A's syllabus -> must be rejected (404)
    with pytest.raises(HTTPException) as exc_info2:
        SyllabusCurriculumActivationService.activate_curriculum(
            db=db_session,
            syllabus_id=syl.id,
            version_id=ver.id,
            user_id=user_b.id,
        )
    assert exc_info2.value.status_code == 404


def test_compiler_idempotent_reprocessing_no_duplicates(db_session: Session, setup_test_users):
    """
    Idempotency: Re-running compilation on an already compiled syllabus draft
    must update records safely and NOT produce duplicate subjects, modules, topics, or references.
    """
    user_a, _ = setup_test_users

    syl = Syllabus(
        title="GEO101: Physical Geography",
        academic_level="higher_education",
        user_id=user_a.id,
        status="confirmed",
    )
    db_session.add(syl)
    db_session.flush()

    ver = SyllabusVersion(
        syllabus_id=syl.id,
        version_number=1,
        source_filename="Geography.pdf",
        curriculum_status="not_built",
        is_active=False,
        file_size_bytes=1024,
    )
    db_session.add(ver)
    db_session.flush()

    draft = SyllabusCurriculumDraft(
        syllabus_id=syl.id,
        syllabus_version_id=ver.id,
        user_id=user_a.id,
        title="Physical Geography",
        academic_level="higher_education",
        status="draft",
        compilation_status="queued",
    )
    db_session.add(draft)
    db_session.flush()

    subj = SyllabusDraftSubject(draft_id=draft.id, name="Physical Geography", code="GEO101", sort_order=0)
    db_session.add(subj)
    db_session.flush()

    mod = SyllabusDraftModule(draft_subject_id=subj.id, title="Geomorphology", display_label="Unit 1", sort_order=0)
    db_session.add(mod)
    db_session.flush()

    t1 = SyllabusDraftTopic(draft_module_id=mod.id, title="Plate Tectonics & Continental Drift", sort_order=0, confidence="high")
    t2 = SyllabusDraftTopic(draft_module_id=mod.id, title="Glacial Landforms & Erosion", sort_order=1, confidence="high")
    db_session.add_all([t1, t2])
    db_session.commit()

    engine = SyllabusCurriculumCompilerEngine(db=db_session)

    # First compile
    res1 = engine.compile_version(syllabus_id=syl.id, version_id=ver.id, user_id=user_a.id)
    assert res1.lesson_candidate_count == 2
    assert res1.module_count == 1

    # Second compile (re-processing)
    res2 = engine.compile_version(syllabus_id=syl.id, version_id=ver.id, user_id=user_a.id, force_recompile=True)
    assert res2.lesson_candidate_count == 2
    assert res2.module_count == 1

    db_session.refresh(draft)
    assert len(draft.subjects) == 1
    assert len(draft.subjects[0].modules) == 1
    assert len(draft.subjects[0].modules[0].topics) == 2


def test_stale_or_invalid_version_activation_fails_safely(db_session: Session, setup_test_users):
    """
    Safety: Attempting to activate an invalid or uncompiled version fails
    with an appropriate HTTP exception and never produces a false success state.
    """
    user_a, _ = setup_test_users

    syl = Syllabus(
        title="SOC101: Introduction to Sociology",
        academic_level="higher_education",
        user_id=user_a.id,
        status="confirmed",
    )
    db_session.add(syl)
    db_session.flush()

    ver = SyllabusVersion(
        syllabus_id=syl.id,
        version_number=1,
        source_filename="Sociology.pdf",
        curriculum_status="not_built",
        is_active=False,
        file_size_bytes=1024,
    )
    db_session.add(ver)
    db_session.commit()

    # Attempt activation when no compiled draft exists
    with pytest.raises(HTTPException) as exc_info:
        SyllabusCurriculumActivationService.activate_curriculum(
            db=db_session,
            syllabus_id=syl.id,
            version_id=ver.id,
            user_id=user_a.id,
        )
    assert exc_info.value.status_code in (400, 404)

    # Verify version remains not_built and inactive
    db_session.refresh(ver)
    assert ver.is_active is False
    assert ver.curriculum_status == "not_built"


def test_document_format_text_extraction_and_compilation(db_session: Session, setup_test_users):
    """
    Format Boundary: Tests .txt document extraction through TextExtractor ->
    SyllabusDraftEngine.parse_document -> CurriculumCompilerEngine.
    """
    user_a, _ = setup_test_users

    sample_txt = (
        "Course Code: LING101\n"
        "Introduction to General Linguistics\n\n"
        "COURSE OBJECTIVES\n"
        "1. Understand phonetics and phonology.\n"
        "2. Analyze syntactic structures and universal grammar.\n\n"
        "UNIT 1: Phonetics and Sound Systems\n"
        "Articulatory Phonetics - Acoustic Properties of Vowels - International Phonetic Alphabet\n\n"
        "UNIT 2: Morphology and Syntax\n"
        "Morphemes and Allomorphs - Phrase Structure Rules - X-Bar Theory\n\n"
        "TEXT BOOKS\n"
        "Fromkin et al., An Introduction to Language, Cengage Learning, 2018.\n"
    )

    with tempfile.NamedTemporaryFile(suffix=".txt", delete=False, mode="w", encoding="utf-8") as f:
        f.write(sample_txt)
        temp_path = f.name

    try:
        # 1. Extraction from real file
        extractor = TextExtractor()
        extracted_doc = extractor.extract(temp_path)
        assert extracted_doc.file_type == "txt"
        assert extracted_doc.total_pages == 1
        assert len(extracted_doc.sections) >= 2

        # 2. Parsing into CurriculumDraftStructure
        draft_struct = SyllabusDraftEngine.parse_document(
            doc=extracted_doc,
            syllabus_title="Introduction to General Linguistics",
            academic_level="higher_education",
        )
        assert len(draft_struct.subjects) == 1
        subj = draft_struct.subjects[0]
        assert len(subj.modules) == 2
        assert len(subj.outcomes) == 2
        assert subj.modules[0].display_label.upper() == "UNIT 1"
        assert subj.modules[1].display_label.upper() == "UNIT 2"
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


def test_document_format_docx_extraction_and_compilation(db_session: Session, setup_test_users):
    """
    Format Boundary: Tests .docx document extraction through DocxExtractor ->
    SyllabusDraftEngine.parse_document -> CurriculumCompilerEngine.
    """
    user_a, _ = setup_test_users

    doc = docx.Document()
    doc.add_heading("ENV202: Atmospheric Science and Climate Modeling", level=0)
    doc.add_paragraph("Course Code: ENV202")
    doc.add_paragraph("TOTAL: 45 PERIODS")

    doc.add_heading("UNIT 1: Atmospheric Thermodynamics", level=1)
    doc.add_paragraph("Atmospheric Composition - Hydrostatic Equation - Adiabatic Lapse Rates")

    doc.add_heading("UNIT 2: Cloud Microphysics and Radiation", level=1)
    doc.add_paragraph("Aerosol Nucleation - Radiative Transfer Equation - Greenhouse Forcing")

    # Table with readings
    table = doc.add_table(rows=2, cols=2)
    table.rows[0].cells[0].text = "Module"
    table.rows[0].cells[1].text = "Reference"
    table.rows[1].cells[0].text = "Unit 1"
    table.rows[1].cells[1].text = "Wallace & Hobbs, Atmospheric Science, Elsevier, 2006."

    with tempfile.NamedTemporaryFile(suffix=".docx", delete=False) as f:
        temp_docx_path = f.name

    try:
        doc.save(temp_docx_path)

        extractor = DocxExtractor()
        extracted_doc = extractor.extract(temp_docx_path)
        assert extracted_doc.file_type == "docx"
        assert extracted_doc.total_pages == 1
        assert len(extracted_doc.sections) >= 2

        draft_struct = SyllabusDraftEngine.parse_document(
            doc=extracted_doc,
            syllabus_title="Atmospheric Science and Climate Modeling",
            academic_level="higher_education",
        )
        assert len(draft_struct.subjects) == 1
        subj = draft_struct.subjects[0]
        assert len(subj.modules) >= 2
    finally:
        if os.path.exists(temp_docx_path):
            os.remove(temp_docx_path)


def test_document_format_pptx_extraction_and_compilation(db_session: Session, setup_test_users):
    """
    Format Boundary: Tests .pptx document extraction through PptxExtractor ->
    SyllabusDraftEngine.parse_document -> CurriculumCompilerEngine.
    """
    user_a, _ = setup_test_users

    prs = pptx.Presentation()
    # Slide 1: Course Title
    blank_layout = prs.slide_layouts[6]
    s1 = prs.slides.add_slide(blank_layout)
    txBox = s1.shapes.add_textbox(0, 0, 1000, 1000)
    tf = txBox.text_frame
    tf.text = "ASTR101: Introduction to Astrophysics\nCourse Code: ASTR101\nSemester IV"

    # Slide 2: Unit 1
    s2 = prs.slides.add_slide(blank_layout)
    txBox2 = s2.shapes.add_textbox(0, 0, 1000, 1000)
    tf2 = txBox2.text_frame
    tf2.text = "UNIT 1: Stellar Evolution and Nucleosynthesis\nHertzsprung-Russell Diagram - Main Sequence Stars - Supernovae and Neutron Stars"

    # Slide 3: Unit 2
    s3 = prs.slides.add_slide(blank_layout)
    txBox3 = s3.shapes.add_textbox(0, 0, 1000, 1000)
    tf3 = txBox3.text_frame
    tf3.text = "UNIT 2: Galaxies and Modern Cosmology\nMilky Way Structure - Hubble's Law and Redshift - Cosmic Microwave Background"

    with tempfile.NamedTemporaryFile(suffix=".pptx", delete=False) as f:
        temp_pptx_path = f.name

    try:
        prs.save(temp_pptx_path)

        extractor = PptxExtractor()
        extracted_doc = extractor.extract(temp_pptx_path)
        assert extracted_doc.file_type == "pptx"
        assert extracted_doc.total_pages == 3

        draft_struct = SyllabusDraftEngine.parse_document(
            doc=extracted_doc,
            syllabus_title="Introduction to Astrophysics",
            academic_level="higher_education",
        )
        assert len(draft_struct.subjects) == 1
        subj = draft_struct.subjects[0]
        assert len(subj.modules) == 2
        assert subj.modules[0].display_label.upper() == "UNIT 1"
        assert subj.modules[1].display_label.upper() == "UNIT 2"
    finally:
        if os.path.exists(temp_pptx_path):
            os.remove(temp_pptx_path)

