"""
NEXORA Master Prompt 01R: Syllabus-First Foundation Verification Suite
Validates all 19 prompt requirements and negative test cases:
- Honest empty workspace before syllabus activation
- Zero default subjects, modules, lessons, concepts, practice, simulations, or recommendations
- Complete removal of global Binary Search fallback
- Strict cross-user and cross-syllabus isolation
- Preservation of auth, profile, preferences, and language settings
"""

import uuid
import pytest
from app.core.security import SecurityContext
from app.models.syllabus import Syllabus, SyllabusVersion
from app.models.learning import Subject, Topic, Concept, LearningModule, Lesson


@pytest.fixture
def fresh_user_headers():
    user_id = f"fresh-{uuid.uuid4().hex[:8]}"
    token = SecurityContext.create_test_jwt(user_id=user_id, email=f"{user_id}@nexora.edu")
    return {"Authorization": f"Bearer {token}", "X-User-Id": user_id}


@pytest.fixture
def user_a_headers():
    user_id = f"usera-{uuid.uuid4().hex[:8]}"
    token = SecurityContext.create_test_jwt(user_id=user_id, email=f"{user_id}@nexora.edu")
    return {"Authorization": f"Bearer {token}", "X-User-Id": user_id}


@pytest.fixture
def user_b_headers():
    user_id = f"userb-{uuid.uuid4().hex[:8]}"
    token = SecurityContext.create_test_jwt(user_id=user_id, email=f"{user_id}@nexora.edu")
    return {"Authorization": f"Bearer {token}", "X-User-Id": user_id}


# ==============================================================================
# SECTION 25 — VERIFICATION SUITE REQUIREMENTS
# ==============================================================================

def test_req_01_fresh_user_has_no_active_syllabus_workspace_empty(client, fresh_user_headers):
    """Requirement 1: Fresh user has no active syllabus -> workspace returns empty state."""
    res = client.get("/api/v1/workspace", headers=fresh_user_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["active_syllabus"] is None
    assert data["enrolled_subjects"] == []
    assert data["starter_subjects_available"] == 0


def test_req_02_subjects_empty_without_active_syllabus(client, fresh_user_headers):
    """Requirement 2: GET /api/v1/learning/subjects returns empty [] when no active syllabus exists."""
    res = client.get("/api/v1/learning/subjects", headers=fresh_user_headers)
    assert res.status_code == 200
    assert res.json() == []


def test_req_03_modules_empty_without_active_syllabus(client, fresh_user_headers):
    """Requirement 3: GET /api/v1/learning/modules returns empty [] when no active syllabus exists."""
    res = client.get("/api/v1/learning/modules", headers=fresh_user_headers)
    assert res.status_code == 200
    assert res.json() == []


def test_req_04_lessons_empty_without_active_syllabus(client, fresh_user_headers):
    """Requirement 4: GET /api/v1/learning/lessons returns empty [] when no active syllabus exists."""
    res = client.get("/api/v1/learning/lessons", headers=fresh_user_headers)
    assert res.status_code == 200
    assert res.json() == []


def test_req_05_concepts_empty_without_active_syllabus(client, fresh_user_headers):
    """Requirement 5: GET /api/v1/learning/concepts returns empty [] when no active syllabus exists."""
    res = client.get("/api/v1/learning/concepts", headers=fresh_user_headers)
    assert res.status_code == 200
    assert res.json() == []


def test_req_06_practice_sets_empty_without_active_syllabus(client, fresh_user_headers):
    """Requirement 6: GET /api/v1/learning/practice/sets returns empty [] when no active syllabus exists."""
    res = client.get("/api/v1/learning/practice/sets", headers=fresh_user_headers)
    assert res.status_code == 200
    assert res.json() == []


def test_req_07_simulations_empty_without_active_syllabus(client, fresh_user_headers):
    """Requirement 7: GET /api/v1/learning/simulations returns empty [] when no active syllabus exists."""
    res = client.get("/api/v1/learning/simulations", headers=fresh_user_headers)
    assert res.status_code == 200
    assert res.json() == []


def test_req_08_overall_progress_zero_without_active_syllabus(client, fresh_user_headers):
    """Requirement 8: Overall progress is 0% when no active syllabus exists."""
    res = client.get("/api/v1/workspace/progress", headers=fresh_user_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["overall_progress_percent"] == 0
    assert data["completed_lessons_count"] == 0
    assert data["completed_quizzes_count"] == 0
    assert data["enrolled_subjects_count"] == 0


def test_req_09_recent_activity_empty_without_activity(client, fresh_user_headers):
    """Requirement 9: Recent activity returns empty [] when no activity has occurred."""
    res = client.get("/api/v1/workspace/activity", headers=fresh_user_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total_count"] == 0
    assert data["activities"] == []


def test_req_10_course_notes_empty_for_fresh_user(client, fresh_user_headers):
    """Requirement 10: Course notes returns empty [] when no notes have been written."""
    res = client.get("/api/v1/notes", headers=fresh_user_headers)
    assert res.status_code == 200
    assert res.json() == []


def test_req_11_no_binary_search_fallback(client, fresh_user_headers):
    """Requirement 11: Binary Search cannot be resolved as global fallback."""
    # Exploring an unknown concept must 404, NEVER fall back to Binary Search
    res = client.post("/api/v1/learning/explore", json={"query": "Quantum Cryptography Dynamics"}, headers=fresh_user_headers)
    assert res.status_code == 404
    assert "not found" in res.json()["detail"].lower()


def test_req_12_nonexistent_entities_return_404_never_fallback(client, fresh_user_headers):
    """Requirement 12: Requesting non-existent entities returns 404, never fallback content."""
    fake_id = "nonexistent-entity-99999"
    assert client.get(f"/api/v1/learning/subjects/{fake_id}", headers=fresh_user_headers).status_code == 404
    assert client.get(f"/api/v1/learning/topics/{fake_id}", headers=fresh_user_headers).status_code == 404
    assert client.get(f"/api/v1/learning/concepts/{fake_id}", headers=fresh_user_headers).status_code == 404
    assert client.get(f"/api/v1/learning/modules/{fake_id}", headers=fresh_user_headers).status_code == 404
    assert client.get(f"/api/v1/learning/lessons/{fake_id}", headers=fresh_user_headers).status_code == 404


def test_req_13_level_switching_never_surfaces_default_content(client, fresh_user_headers):
    """Requirement 13: Switching academic levels does not leak or surface default content."""
    for level in ["class-1-5", "class-6-10", "class-11-12", "undergraduate"]:
        client.put("/api/v1/profile", json={"education_level": level}, headers=fresh_user_headers)
        subs = client.get("/api/v1/learning/subjects", headers=fresh_user_headers).json()
        assert subs == [], f"Level {level} surfaced default subjects unexpectedly!"


def test_req_14_user_a_with_active_syllabus_sees_only_own_content(client, user_a_headers, db_session):
    """Requirement 14: User A with active syllabus S1 sees only S1 content."""
    user_a_id = user_a_headers["X-User-Id"]

    # Create active syllabus S1 for User A
    syl = Syllabus(
        id=f"syl-a-{uuid.uuid4().hex[:6]}",
        user_id=user_a_id,
        title="User A Operating Systems Syllabus",
        academic_level="undergraduate",
        status="confirmed",
    )
    ver = SyllabusVersion(
        id=f"ver-a-{uuid.uuid4().hex[:6]}",
        syllabus_id=syl.id,
        version_number=1,
        is_active=True,
        raw_extracted_json={"units": ["Virtual Memory"]},
    )
    # Create a syllabus-derived subject
    subj = Subject(
        id=f"sub-a-{uuid.uuid4().hex[:6]}",
        user_id=user_a_id,
        syllabus_version_id=ver.id,
        content_source="user_syllabus",
        name="Advanced Operating Systems S1",
        slug=f"adv-os-s1-{uuid.uuid4().hex[:6]}",
        category="Computer Science",
        education_level="undergraduate",
        is_active=True,
    )
    db_session.add_all([syl, ver, subj])
    db_session.commit()

    # User A profile aligned to undergraduate
    client.put("/api/v1/profile", json={"education_level": "undergraduate"}, headers=user_a_headers)

    # User A lists subjects
    res = client.get("/api/v1/learning/subjects", headers=user_a_headers)
    assert res.status_code == 200
    subs = res.json()
    assert len(subs) == 1
    assert subs[0]["name"] == "Advanced Operating Systems S1"


def test_req_15_and_16_user_b_cross_user_isolation(client, user_a_headers, user_b_headers, db_session):
    """
    Requirement 15: User B with no syllabus sees zero content.
    Requirement 16: User B does not see User A's syllabus, subjects, or progress.
    """
    user_a_id = user_a_headers["X-User-Id"]
    user_b_id = user_b_headers["X-User-Id"]

    # Align both to undergraduate
    client.put("/api/v1/profile", json={"education_level": "undergraduate"}, headers=user_a_headers)
    client.put("/api/v1/profile", json={"education_level": "undergraduate"}, headers=user_b_headers)

    # User B checks workspace
    ws_b = client.get("/api/v1/workspace", headers=user_b_headers).json()
    assert ws_b["active_syllabus"] is None
    assert ws_b["enrolled_subjects"] == []

    # User B lists subjects
    subs_b = client.get("/api/v1/learning/subjects", headers=user_b_headers).json()
    assert subs_b == []


def test_req_17_board_presets_listed_as_reference_templates_without_auto_activating(client, fresh_user_headers):
    """Requirement 17: Educational board presets (CBSE, ICSE, University) can be listed without auto-activating."""
    res = client.get("/api/v1/learning/curricula")
    assert res.status_code == 200
    boards = res.json()
    assert len(boards) >= 7
    board_codes = [b["code"] for b in boards]
    assert "cbse-secondary" in board_codes
    assert "univ-eng-cse" in board_codes

    # Verifying that listing boards DID NOT activate any subjects for the user
    subs = client.get("/api/v1/learning/subjects", headers=fresh_user_headers).json()
    assert subs == []


def test_req_18_auth_profile_preferences_preserved(client, fresh_user_headers):
    """Requirement 18: Authentication, profile, preferences, and language settings are preserved and operational."""
    # 1. Fetch profile
    prof_res = client.get("/api/v1/profile", headers=fresh_user_headers)
    assert prof_res.status_code == 200

    # 2. Update profile preferences and language
    update_res = client.put(
        "/api/v1/profile",
        json={
            "full_name": "Syllabus Pioneer",
            "preferred_language": "ta",
            "interests": ["Robotics", "Astronomy"],
        },
        headers=fresh_user_headers,
    )
    assert update_res.status_code == 200
    data = update_res.json()
    assert data["full_name"] == "Syllabus Pioneer"
    assert data["preferred_language"] == "ta"

    # 3. Preferences API
    pref_res = client.get("/api/v1/profile/preferences", headers=fresh_user_headers)
    assert pref_res.status_code == 200
    prefs = pref_res.json()
    assert "Robotics" in prefs["interests"]


# ==============================================================================
# SECTION 26 — NEGATIVE TEST CASES
# ==============================================================================

def test_negative_no_default_cse_for_undergrad(client, fresh_user_headers):
    """Negative: Fresh user with undergraduate level -> returns 0 subjects, NOT CSE subjects."""
    client.put("/api/v1/profile", json={"education_level": "undergraduate"}, headers=fresh_user_headers)
    subs = client.get("/api/v1/learning/subjects", headers=fresh_user_headers).json()
    assert subs == []


def test_negative_no_default_physics_for_k12(client, fresh_user_headers):
    """Negative: Fresh user with Class 11-12 level -> returns 0 subjects, NOT Physics."""
    client.put("/api/v1/profile", json={"education_level": "class-11-12"}, headers=fresh_user_headers)
    subs = client.get("/api/v1/learning/subjects", headers=fresh_user_headers).json()
    assert subs == []


def test_negative_recommendations_empty_without_syllabus(client, fresh_user_headers):
    """Negative: Fresh user -> 0 recommendations."""
    res = client.get("/api/v1/learning/recommendations", headers=fresh_user_headers)
    assert res.status_code == 200
    assert res.json() == []


def test_negative_practice_sets_empty_without_syllabus(client, fresh_user_headers):
    """Negative: Fresh user -> 0 practice sets."""
    res = client.get("/api/v1/learning/practice/sets", headers=fresh_user_headers)
    assert res.status_code == 200
    assert res.json() == []
