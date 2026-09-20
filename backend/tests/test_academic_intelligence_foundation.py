import pytest
import uuid
from app.core.security import SecurityContext
from app.db.session import SessionLocal
from app.models.profile import UserProfile
from app.models.learning import PracticeSet, PracticeQuestion
from app.models.progress import UserProgress, QuizAttempt, AcademicActivityLog
from app.models.notes import Note


@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def test_level_switch_state_isolation_and_switchback(client, db):
    """
    Test level switching with strict state isolation:
    (user_id, academic_level) scopes UserProgress, QuizAttempt, Note, and AcademicActivityLog.
    When switching from class_6_10 to undergraduate, the state becomes isolated/zero.
    When switching back to class_6_10, historical progress and activity are intact.
    """
    user_id = str(uuid.uuid4())
    token = SecurityContext.create_test_jwt(user_id=user_id, email=f"student_{user_id[:8]}@nexora.dev")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Initialize profile as class-6-10 (Secondary)
    client.put(
        "/api/v1/profile",
        json={
            "education_level": "class-6-10",
            "education_category": "secondary",
            "grade_level": "Class 10",
            "board_type": "national",
            "curriculum_id": "cur-00000000-0000-0000-0000-000000000002",
        },
        headers=headers,
    )

    # 2. Add activity, progress, and note for class_6_10
    note_res = client.post(
        "/api/v1/notes",
        json={
            "title": "Newton's Second Law Reflection",
            "content": "Force equals mass times acceleration: $F = ma$.",
            "academic_level": "class_6_10",
            "tags": ["physics", "dynamics"],
        },
        headers=headers,
    )
    assert note_res.status_code in [200, 201]
    note_id = note_res.json()["id"]

    act_res = client.post(
        "/api/v1/workspace/activity",
        json={
            "activity_type": "lesson_complete",
            "title": "Finished Force and Pressure Dynamics",
            "description": "Explored Newton's second law and fluid pressure.",
            "meta": {"score": 100},
        },
        headers=headers,
    )
    assert act_res.status_code in [200, 201]

    # Submit practice set for class_6_10
    submit_res = client.post(
        "/api/v1/learning/practice/submit",
        json={
            "set_id": "ps-00000000-0000-0000-0000-000000000001",
            "answers": [
                {"question_id": "ps-00000000-0000-0000-0000-000000000001-q1", "selected_index": 0},
                {"question_id": "ps-00000000-0000-0000-0000-000000000001-q2", "selected_index": 0},
                {"question_id": "ps-00000000-0000-0000-0000-000000000001-q3", "selected_index": 0},
            ],
        },
        headers=headers,
    )
    assert submit_res.status_code == 200
    assert submit_res.json()["score_percentage"] == 100.0

    # Verify workspace progress and activity under class_6_10
    sec_prog = client.get("/api/v1/workspace/progress", headers=headers).json()
    assert sec_prog["academic_level"] == "class_6_10"
    assert sec_prog["completed_quizzes_count"] >= 1

    sec_acts_feed = client.get("/api/v1/workspace/activity", headers=headers).json()
    assert sec_acts_feed["total_count"] >= 2 or len(sec_acts_feed.get("activities", [])) >= 2

    sec_notes = client.get("/api/v1/notes", params={"academic_level": "class_6_10"}, headers=headers).json()
    assert len(sec_notes) == 1
    assert sec_notes[0]["id"] == note_id

    # 3. SWITCH TO UNDERGRADUATE
    client.put(
        "/api/v1/profile",
        json={
            "education_level": "undergraduate",
            "education_category": "undergraduate",
            "grade_level": "Year 2",
            "degree": "B.Tech",
            "department": "Computer Science",
            "specialization": "AI",
        },
        headers=headers,
    )

    # 4. Verify ISOLATION under undergraduate
    ug_prog = client.get("/api/v1/workspace/progress", headers=headers).json()
    assert ug_prog["academic_level"] == "undergraduate"
    assert ug_prog["completed_quizzes_count"] == 0
    assert ug_prog["completed_lessons_count"] == 0

    ug_acts_feed = client.get("/api/v1/workspace/activity", headers=headers).json()
    assert ug_acts_feed["total_count"] == 0

    ug_notes = client.get("/api/v1/notes", params={"academic_level": "undergraduate"}, headers=headers).json()
    assert len(ug_notes) == 0

    # 5. SWITCH BACK TO CLASS_6_10
    client.put(
        "/api/v1/profile",
        json={
            "education_level": "class-6-10",
            "education_category": "secondary",
            "grade_level": "Class 10",
        },
        headers=headers,
    )

    # 6. Verify HISTORICAL STATE RESTORED
    restored_prog = client.get("/api/v1/workspace/progress", headers=headers).json()
    assert restored_prog["academic_level"] == "class_6_10"
    assert restored_prog["completed_quizzes_count"] >= 1

    restored_acts_feed = client.get("/api/v1/workspace/activity", headers=headers).json()
    assert restored_acts_feed["total_count"] >= 2 or len(restored_acts_feed.get("activities", [])) >= 2

    restored_notes = client.get("/api/v1/notes", params={"academic_level": "class_6_10"}, headers=headers).json()
    assert len(restored_notes) == 1
    assert restored_notes[0]["id"] == note_id


def test_user_notes_crud_and_cross_user_isolation(client):
    """
    Test student-owned notes API with real database persistence:
    - User A creates, updates, pins, and reads their note
    - User B cannot access, modify, or delete User A's note (404/isolated)
    """
    user_a = str(uuid.uuid4())
    token_a = SecurityContext.create_test_jwt(user_id=user_a, email=f"usera_{user_a[:6]}@nexora.dev")
    headers_a = {"Authorization": f"Bearer {token_a}"}

    user_b = str(uuid.uuid4())
    token_b = SecurityContext.create_test_jwt(user_id=user_b, email=f"userb_{user_b[:6]}@nexora.dev")
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # User A creates note
    create_res = client.post(
        "/api/v1/notes",
        json={
            "title": "Binary Tree Invariants",
            "content": "In-order traversal of a valid BST always produces sorted keys.",
            "academic_level": "undergraduate",
            "tags": ["algorithms", "dsa"],
            "is_pinned": False,
        },
        headers=headers_a,
    )
    assert create_res.status_code in [200, 201]
    note_id = create_res.json()["id"]
    assert create_res.json()["user_id"] == user_a
    assert create_res.json()["is_pinned"] is False

    # User A pins note
    pin_res = client.patch(f"/api/v1/notes/{note_id}/pin", headers=headers_a)
    assert pin_res.status_code == 200
    assert pin_res.json()["is_pinned"] is True

    # User A updates note
    update_res = client.put(
        f"/api/v1/notes/{note_id}",
        json={
            "title": "Binary Tree Invariants (Updated)",
            "content": "In-order traversal yields monotonic sorted order.",
            "tags": ["dsa", "trees"],
        },
        headers=headers_a,
    )
    assert update_res.status_code == 200
    assert update_res.json()["title"] == "Binary Tree Invariants (Updated)"

    # User B tries to read User A's note -> 404
    b_read = client.get(f"/api/v1/notes/{note_id}", headers=headers_b)
    assert b_read.status_code == 404

    # User B tries to update User A's note -> 404
    b_update = client.put(f"/api/v1/notes/{note_id}", json={"title": "Hacked"}, headers=headers_b)
    assert b_update.status_code == 404

    # User B tries to delete User A's note -> 404
    b_del = client.delete(f"/api/v1/notes/{note_id}", headers=headers_b)
    assert b_del.status_code == 404

    # User A deletes their note -> 200
    a_del = client.delete(f"/api/v1/notes/{note_id}", headers=headers_a)
    assert a_del.status_code == 200


def test_practice_sets_and_evaluation_api(client):
    """
    Test lesson/concept-aware practice sets and grading API:
    - Lists sets filtered by academic level
    - Set questions do not leak correct answer indices or explanations
    - Submission returns graded result with explanations and points
    """
    user_id = str(uuid.uuid4())
    token = SecurityContext.create_test_jwt(user_id=user_id, email=f"practice_{user_id[:6]}@nexora.dev")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Query practice sets for class_1_5
    sets_res = client.get("/api/v1/learning/practice/sets", params={"academic_level": "class_1_5"}, headers=headers)
    assert sets_res.status_code == 200
    sets_data = sets_res.json()
    assert len(sets_data) >= 1
    target_set = sets_data[0]
    set_id = target_set["id"]

    # 2. Get specific practice set with questions
    detail_res = client.get(f"/api/v1/learning/practice/sets/{set_id}", headers=headers)
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert len(detail["questions"]) >= 1

    for q in detail["questions"]:
        # Verify student question schema hides answers before evaluation
        assert "options" in q
        assert "question_text" in q
        assert q.get("correct_index") is None
        assert q.get("explanation") is None

    # 3. Submit evaluation
    q1 = detail["questions"][0]
    sub_res = client.post(
        "/api/v1/learning/practice/submit",
        json={
            "set_id": set_id,
            "answers": [{"question_id": q1["id"], "selected_index": 0}],
        },
        headers=headers,
    )
    assert sub_res.status_code == 200
    result = sub_res.json()
    assert "score_percentage" in result
    assert "passed" in result
    assert "results" in result
    assert len(result["results"]) >= 1
    # Post-submission returns answers and explanations for learning
    assert "correct_index" in result["results"][0]
    assert "explanation" in result["results"][0]
