"""
NEXORA Academic Context Hardening & Isolation Regression Suite (Prompt 06R)
Validates strict level isolation, cross-level switching, no activity/progress bleed,
and deterministic context fingerprinting.
"""

import uuid
import pytest
from app.core.security import SecurityContext


@pytest.fixture
def student_k12_headers():
    user_id = f"k12-{uuid.uuid4().hex[:8]}"
    token = SecurityContext.create_test_jwt(user_id=user_id, email=f"{user_id}@nexora.edu")
    return {"Authorization": f"Bearer {token}", "X-User-Id": user_id}


@pytest.fixture
def student_ug_headers():
    user_id = f"ug-{uuid.uuid4().hex[:8]}"
    token = SecurityContext.create_test_jwt(user_id=user_id, email=f"{user_id}@nexora.edu")
    return {"Authorization": f"Bearer {token}", "X-User-Id": user_id}


def test_level_switch_activity_and_progress_isolation(client, student_k12_headers):
    """
    Validates that when a student switches academic level:
    1. Previous level's activity does NOT bleed into the new level.
    2. Previous level's enrolled subjects do NOT appear in the new level.
    3. Progress reports honest 0s for the new level (zero fake data).
    4. Switching back to the original level completely restores the original level's state.
    """
    # 1. Configure Student as Class 6-10 (Middle / Secondary)
    prof_res = client.put(
        "/api/v1/profile",
        json={
            "full_name": "Rohan Verma",
            "education_level": "class-6-10",
            "education_category": "middle",
            "grade_level": "Class 8",
            "academic_domain": "General Science & Mathematics",
            "preferred_language": "en",
        },
        headers=student_k12_headers,
    )
    assert prof_res.status_code == 200

    # Verify context fingerprint is resolved
    ctx_res = client.get("/api/v1/workspace/context", headers=student_k12_headers)
    assert ctx_res.status_code == 200
    ctx_sec = ctx_res.json()
    assert ctx_sec["academic_level"] == "class_6_10"
    sec_fingerprint = ctx_sec["context_fingerprint"]
    assert sec_fingerprint is not None

    # 2. Enroll in Class 6-10 Science
    subs_res = client.get("/api/v1/learning/subjects?education_level=class-6-10")
    assert subs_res.status_code == 200
    sec_subs = subs_res.json()
    science_subj = next(s for s in sec_subs if "science" in s["slug"])

    enroll_res = client.post(
        "/api/v1/workspace/enroll-subject",
        json={"subject_id": science_subj["id"]},
        headers=student_k12_headers,
    )
    assert enroll_res.status_code == 201

    # 3. Record genuine activity for Class 6-10
    act_res = client.post(
        "/api/v1/workspace/activity",
        json={
            "activity_type": "lesson_viewed",
            "subject_id": science_subj["id"],
            "title": "Explored Cell Structure and Function",
            "description": "Studied cellular organelles in Class 8 Science",
            "meta": {"source": "test"},
        },
        headers=student_k12_headers,
    )
    assert act_res.status_code == 201

    # 4. Verify Class 6-10 feed has 1 activity and 1 enrolled subject
    feed_sec = client.get("/api/v1/workspace/activity", headers=student_k12_headers).json()
    assert feed_sec["total_count"] == 1
    assert feed_sec["activities"][0]["title"] == "Explored Cell Structure and Function"

    enrolled_sec = client.get("/api/v1/workspace/enrolled-subjects", headers=student_k12_headers).json()
    assert len(enrolled_sec) == 1
    assert enrolled_sec[0]["id"] == science_subj["id"]

    # 5. Switch student profile to Higher Secondary (class-11-12)
    switch_res = client.put(
        "/api/v1/profile",
        json={
            "education_level": "class-11-12",
            "education_category": "higher_secondary",
            "grade_level": "Class 12",
            "academic_domain": "Physics, Chemistry, Mathematics",
        },
        headers=student_k12_headers,
    )
    assert switch_res.status_code == 200

    # 6. Verify context fingerprint changes
    ctx_res2 = client.get("/api/v1/workspace/context", headers=student_k12_headers)
    assert ctx_res2.status_code == 200
    ctx_hs = ctx_res2.json()
    assert ctx_hs["academic_level"] == "class_11_12"
    assert ctx_hs["context_fingerprint"] != sec_fingerprint

    # 7. CRITICAL: Verify Class 8 activity NEVER leaks into Class 12 feed
    feed_hs = client.get("/api/v1/workspace/activity", headers=student_k12_headers).json()
    assert feed_hs["total_count"] == 0
    assert len(feed_hs["activities"]) == 0

    # 8. CRITICAL: Verify Class 8 enrolled subjects do NOT appear in Class 12 enrolled subjects
    enrolled_hs = client.get("/api/v1/workspace/enrolled-subjects", headers=student_k12_headers).json()
    assert len(enrolled_hs) == 0

    # 9. CRITICAL: Verify Class 12 workspace progress reports honest 0s (no fake data)
    prog_hs = client.get("/api/v1/workspace/progress", headers=student_k12_headers).json()
    assert prog_hs["academic_level"] == "class_11_12"
    assert prog_hs["completed_lessons_count"] == 0
    assert prog_hs["completed_quizzes_count"] == 0
    assert prog_hs["enrolled_subjects_count"] == 0
    assert prog_hs["overall_progress_percent"] == 0

    # 10. Switch BACK to Class 6-10
    back_res = client.put(
        "/api/v1/profile",
        json={
            "education_level": "class-6-10",
            "education_category": "middle",
            "grade_level": "Class 8",
        },
        headers=student_k12_headers,
    )
    assert back_res.status_code == 200

    # 11. Verify original Class 6-10 activity and enrollment are completely restored
    restored_feed = client.get("/api/v1/workspace/activity", headers=student_k12_headers).json()
    assert restored_feed["total_count"] == 1
    assert restored_feed["activities"][0]["title"] == "Explored Cell Structure and Function"

    restored_enrolled = client.get("/api/v1/workspace/enrolled-subjects", headers=student_k12_headers).json()
    assert len(restored_enrolled) == 1
    assert restored_enrolled[0]["id"] == science_subj["id"]


def test_cross_student_academic_workspace_isolation(client, student_k12_headers, student_ug_headers):
    """
    Validates cross-student isolation: Student A cannot view or mutate Student B's
    workspace activity, enrollments, or progress.
    """
    # Student A: Class 1-5
    client.put(
        "/api/v1/profile",
        json={"education_level": "class-1-5", "education_category": "primary", "grade_level": "Class 3"},
        headers=student_k12_headers,
    )
    # Student B: Undergraduate
    client.put(
        "/api/v1/profile",
        json={"education_level": "undergraduate", "education_category": "undergraduate", "grade_level": "Year 2"},
        headers=student_ug_headers,
    )

    # Student A records an activity
    client.post(
        "/api/v1/workspace/activity",
        json={
            "activity_type": "lesson_viewed",
            "title": "Primary Numbers and Shapes",
            "description": "Class 3 lesson",
            "meta": {},
        },
        headers=student_k12_headers,
    )

    # Student B queries activity: must be 0
    b_acts = client.get("/api/v1/workspace/activity", headers=student_ug_headers).json()
    assert b_acts["total_count"] == 0

    # Student B queries progress: must be 0
    b_prog = client.get("/api/v1/workspace/progress", headers=student_ug_headers).json()
    assert b_prog["completed_lessons_count"] == 0
    assert b_prog["enrolled_subjects_count"] == 0


def test_primary_level_normalization_and_curriculum_retrieval(client):
    """
    Validates that class_1_5 normalization properly retrieves primary subjects
    and never leaks or defaults to undergraduate CSE.
    """
    # Primary subjects query
    res = client.get("/api/v1/learning/subjects?education_level=class_1_5")
    assert res.status_code == 200
    slugs = [s["slug"] for s in res.json()]
    assert len(slugs) > 0
    # Must contain primary subjects
    assert any("primary" in s or "math" in s or "science" in s or "english" in s for s in slugs)
    # Must NOT contain undergraduate CSE subjects
    assert "operating-systems" not in slugs
    assert "computer-networks" not in slugs
    assert "database-management-systems" not in slugs
