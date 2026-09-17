import uuid
import pytest
from app.models.learning import Subject, Topic, Concept, LearningModule, Lesson
from app.models.profile import UserProfile
from app.core.security import SecurityContext


def test_curriculum_hierarchy_models(db_session):
    """Verifies that all 5 levels of the curriculum hierarchy create, relate, and cascade properly."""
    sub_id = f"sub-test-{uuid.uuid4().hex[:8]}"
    subject = Subject(
        id=sub_id,
        name="Test Distributed Systems",
        slug=f"dist-sys-{uuid.uuid4().hex[:6]}",
        description="Consensus, RPCs, and fault tolerance.",
        icon="Cpu",
        category="Computer Science & Engineering",
        difficulty_level="advanced",
        order_index=10,
        is_active=True,
    )
    db_session.add(subject)
    db_session.flush()

    top_id = f"top-test-{uuid.uuid4().hex[:8]}"
    topic = Topic(
        id=top_id,
        subject_id=subject.id,
        name="Consensus Protocols",
        slug=f"consensus-{uuid.uuid4().hex[:6]}",
        description="Raft, Paxos, and Viewstamped Replication.",
        order_index=1,
        is_active=True,
    )
    db_session.add(topic)
    db_session.flush()

    con_id = f"con-test-{uuid.uuid4().hex[:8]}"
    concept = Concept(
        id=con_id,
        topic_id=topic.id,
        name="Raft Consensus",
        slug=f"raft-consensus-{uuid.uuid4().hex[:6]}",
        summary="Understand leader election and log replication.",
        short_description="Leader election and replicated state machines.",
        difficulty="advanced",
        difficulty_level="advanced",
        order_index=1,
        is_active=True,
    )
    db_session.add(concept)
    db_session.flush()

    mod_id = f"mod-test-{uuid.uuid4().hex[:8]}"
    module = LearningModule(
        id=mod_id,
        concept_id=concept.id,
        title="Raft Leader Election Mechanics",
        slug=f"raft-leader-election-{uuid.uuid4().hex[:6]}",
        description="How heartbeats and randomized timeouts elect leaders.",
        learning_objective="Understand how split votes are resolved with randomized election timeouts.",
        difficulty_level="advanced",
        estimated_minutes=25,
        order_index=1,
        is_active=True,
        why_it_matters="Distributed consensus ensures consistency despite node failures.",
        simple_explanation="A classroom where kids vote for a class captain.",
        technical_explanation="Term-based leader election utilizing majority quorum.",
    )
    db_session.add(module)
    db_session.flush()

    les1_id = f"les-test-{uuid.uuid4().hex[:8]}"
    lesson1 = Lesson(
        id=les1_id,
        module_id=module.id,
        title="Heartbeats & Election Timeouts",
        slug=f"heartbeats-timeouts-{uuid.uuid4().hex[:6]}",
        content_type="explanation",
        content="Followers become candidates when election timer expires.",
        order_index=1,
        estimated_minutes=10,
        is_active=True,
    )
    les2_id = f"les-test-{uuid.uuid4().hex[:8]}"
    lesson2 = Lesson(
        id=les2_id,
        module_id=module.id,
        title="RequestVote RPC Flow",
        slug=f"requestvote-rpc-{uuid.uuid4().hex[:6]}",
        content_type="example",
        content="Candidates request votes from peers.",
        order_index=2,
        estimated_minutes=15,
        is_active=True,
    )
    db_session.add_all([lesson1, lesson2])
    db_session.commit()

    # Verify hierarchy relationships
    reloaded_sub = db_session.query(Subject).filter(Subject.id == sub_id).first()
    assert reloaded_sub is not None
    assert len(reloaded_sub.topics) == 1
    assert reloaded_sub.topics[0].id == top_id

    reloaded_top = reloaded_sub.topics[0]
    assert len(reloaded_top.concepts) == 1
    assert reloaded_top.concepts[0].id == con_id

    reloaded_con = reloaded_top.concepts[0]
    assert len(reloaded_con.learning_modules) == 1
    assert reloaded_con.learning_module.id == mod_id  # testing @property backward-compatibility

    reloaded_mod = reloaded_con.learning_modules[0]
    assert len(reloaded_mod.lessons) == 2
    assert reloaded_mod.lessons[0].title == "Heartbeats & Election Timeouts"
    assert reloaded_mod.lessons[1].title == "RequestVote RPC Flow"

    # Test cascading delete from Subject downwards
    db_session.delete(reloaded_sub)
    db_session.commit()

    assert db_session.query(Topic).filter(Topic.id == top_id).first() is None
    assert db_session.query(Concept).filter(Concept.id == con_id).first() is None
    assert db_session.query(LearningModule).filter(LearningModule.id == mod_id).first() is None
    assert db_session.query(Lesson).filter(Lesson.id == les1_id).first() is None
    assert db_session.query(Lesson).filter(Lesson.id == les2_id).first() is None


def test_curriculum_endpoints_list_and_details(client):
    """Verifies all curriculum listing and detail endpoints across the 5 tiers."""
    # 1. List subjects
    res = client.get("/api/v1/learning/subjects")
    assert res.status_code == 200
    subjects = res.json()
    assert len(subjects) >= 5
    dsa_sub = next(s for s in subjects if s["slug"] == "data-structures-algorithms")
    assert dsa_sub["name"] == "Data Structures & Algorithms"
    assert dsa_sub["topic_count"] >= 4
    assert dsa_sub["concept_count"] >= 4

    # Direct alias endpoint test
    res_direct = client.get("/api/v1/subjects")
    assert res_direct.status_code == 200
    assert len(res_direct.json()) == len(subjects)

    # 2. Subject detail
    res = client.get("/api/v1/learning/subjects/data-structures-algorithms")
    assert res.status_code == 200
    sub_detail = res.json()
    assert sub_detail["slug"] == "data-structures-algorithms"
    assert len(sub_detail["topics"]) >= 4

    # 3. List topics for subject
    res = client.get("/api/v1/learning/subjects/data-structures-algorithms/topics")
    assert res.status_code == 200
    topics = res.json()
    assert any(t["slug"] == "trees-hierarchies" for t in topics)

    # 4. Topic detail
    res = client.get("/api/v1/learning/topics/trees-hierarchies")
    assert res.status_code == 200
    top_detail = res.json()
    assert top_detail["name"] == "Trees & Hierarchies"
    assert len(top_detail["concepts"]) >= 2

    # 5. List concepts for topic
    res = client.get("/api/v1/learning/topics/trees-hierarchies/concepts")
    assert res.status_code == 200
    concepts = res.json()
    assert any(c["slug"] == "binary-search-tree" for c in concepts)

    # 6. Concept detail
    res = client.get("/api/v1/learning/concepts/binary-search-tree")
    assert res.status_code == 200
    con_detail = res.json()
    assert con_detail["name"] == "Binary Search Tree"
    assert len(con_detail["modules"]) >= 1
    assert con_detail["topic_name"] == "Trees & Hierarchies"

    # 7. List modules for concept
    res = client.get("/api/v1/learning/concepts/binary-search-tree/modules")
    assert res.status_code == 200
    modules = res.json()
    assert len(modules) >= 1
    mod = modules[0]
    assert mod["title"] == "Foundations of Binary Search Trees"

    # 8. Module detail
    res = client.get(f"/api/v1/learning/modules/{mod['id']}")
    assert res.status_code == 200
    mod_detail = res.json()
    assert mod_detail["title"] == "Foundations of Binary Search Trees"
    assert len(mod_detail["lessons"]) == 3
    assert mod_detail["concept_name"] == "Binary Search Tree"

    # 9. List lessons for module
    res = client.get(f"/api/v1/learning/modules/{mod['id']}/lessons")
    assert res.status_code == 200
    lessons = res.json()
    assert len(lessons) == 3
    assert lessons[0]["slug"] == "the-bst-invariant"

    # 10. Lesson detail with previous / next navigation pointers
    res = client.get("/api/v1/learning/lessons/the-bst-invariant")
    assert res.status_code == 200
    les_detail = res.json()
    assert les_detail["title"] == "The BST Invariant & Structural Mechanics"
    assert les_detail["content_type"] == "explanation"
    assert "BST Invariant" in les_detail["content"]
    assert les_detail["previous_lesson_slug"] is None
    assert les_detail["next_lesson_slug"] == "search-insertion-walkthrough"

    # Middle lesson has both previous and next
    res_mid = client.get("/api/v1/learning/lessons/search-insertion-walkthrough")
    assert res_mid.status_code == 200
    mid_detail = res_mid.json()
    assert mid_detail["previous_lesson_slug"] == "the-bst-invariant"
    assert mid_detail["next_lesson_slug"] == "core-takeaways-complexity"


def test_curriculum_404_error_handling(client):
    """Verifies that non-existent entities return structured 404 responses."""
    assert client.get("/api/v1/learning/subjects/non-existent-subject").status_code == 404
    assert client.get("/api/v1/learning/topics/non-existent-topic").status_code == 404
    assert client.get("/api/v1/learning/concepts/non-existent-concept").status_code == 404
    assert client.get("/api/v1/learning/modules/non-existent-module").status_code == 404
    assert client.get("/api/v1/learning/lessons/non-existent-lesson").status_code == 404


def test_prompt_04_personalization_in_lesson_detail(client, db_session):
    """
    Verifies that when an authenticated student with selected interests fetches a lesson,
    the lesson detail dynamically attaches a personalized analogy perspective (Prompt 04).
    """
    user_id = str(uuid.uuid4())
    profile = UserProfile(
        id=user_id,
        email="gamer_student@example.com",
        full_name="Gamer Student",
        interests='["Gaming"]',
    )
    db_session.add(profile)
    db_session.commit()

    token = SecurityContext.create_test_jwt(user_id=user_id, email="gamer_student@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/v1/learning/lessons/the-bst-invariant", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["title"] == "The BST Invariant & Structural Mechanics"
    # Personalized context should be attached
    assert data["personalized_context"] is not None
    assert data["personalized_context"]["interest"] == "Gaming"
    assert "Game World" in data["personalized_context"]["headline"]
    assert "Spatial Partitioning" in data["personalized_context"]["headline"]
