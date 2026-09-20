import pytest
from app.core.security import SecurityContext


@pytest.fixture
def student_a_headers():
    token = SecurityContext.create_test_jwt(user_id="student-uuid-aaa-001", email="student.a@nexora.edu")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def student_b_headers():
    token = SecurityContext.create_test_jwt(user_id="student-uuid-bbb-002", email="student.b@nexora.edu")
    return {"Authorization": f"Bearer {token}"}


def test_curriculum_and_education_level_subjects_isolation(client):
    """Verifies that subjects are properly categorized and filtered by education level."""
    # Secondary school filter
    sec_res = client.get("/api/v1/learning/subjects?education_level=class-6-10")
    assert sec_res.status_code == 200
    sec_subjects = sec_res.json()
    sec_slugs = [s["slug"] for s in sec_subjects]
    
    # K-12 secondary subjects MUST be present
    assert "cbse-sec-science" in sec_slugs
    assert "cbse-sec-mathematics" in sec_slugs

    # Advanced undergraduate CSE subjects MUST NOT be present in pure secondary list
    assert "operating-systems" not in sec_slugs
    assert "database-management-systems" not in sec_slugs
    assert "computer-networks" not in sec_slugs

    # Undergraduate filter
    ug_res = client.get("/api/v1/learning/subjects?education_level=undergraduate")
    assert ug_res.status_code == 200
    ug_subjects = ug_res.json()
    ug_slugs = [s["slug"] for s in ug_subjects]
    assert "data-structures-algorithms" in ug_slugs
    assert "operating-systems" in ug_slugs


def test_academic_profile_fields_and_completeness(client, student_a_headers):
    """Verifies that academic profile fields persist and update completeness score."""
    # 1. Fetch initial profile
    res = client.get("/api/v1/profile", headers=student_a_headers)
    assert res.status_code == 200
    initial_data = res.json()
    assert "education_category" in initial_data
    assert "completeness_score" in initial_data

    # 2. Update with full academic context (CBSE Class 8 student)
    curricula_res = client.get("/api/v1/learning/curricula?education_level=class-6-10")
    cbse_curr = next(c for c in curricula_res.json() if "cbse" in c["code"])

    payload = {
        "full_name": "Arjun Sharma",
        "education_level": "class-6-10",
        "education_category": "middle",
        "grade_level": "Class 8",
        "curriculum_id": cbse_curr["id"],
        "academic_domain": "General Science & Mathematics",
        "institution": "National Public School",
        "preferred_language": "en",
    }
    update_res = client.put("/api/v1/profile", json=payload, headers=student_a_headers)
    assert update_res.status_code == 200
    updated = update_res.json()
    assert updated["full_name"] == "Arjun Sharma"
    assert updated["education_category"] == "middle"
    assert updated["grade_level"] == "Class 8"
    assert updated["curriculum_id"] == cbse_curr["id"]
    assert updated["completeness_score"] == 100


def test_subject_enrollment_and_workspace(client, student_a_headers):
    """Verifies enrolling in subjects and reflecting them in the Academic Workspace."""
    # Align student profile to Class 6-10
    client.put(
        "/api/v1/profile",
        json={"education_level": "class-6-10", "grade_level": "Class 8", "education_category": "middle"},
        headers=student_a_headers,
    )

    # Get CBSE science subject
    subjects_res = client.get("/api/v1/learning/subjects?education_level=class-6-10")
    science_subj = next(s for s in subjects_res.json() if "science" in s["slug"])

    # 1. Enroll in science
    enroll_res = client.post(
        "/api/v1/workspace/enroll-subject",
        json={"subject_id": science_subj["id"], "enrollment_source": "curriculum_prescribed"},
        headers=student_a_headers,
    )
    assert enroll_res.status_code == 201
    enroll_data = enroll_res.json()
    assert enroll_data["subject_id"] == science_subj["id"]

    # 2. Check enrolled subjects list
    enrolled_res = client.get("/api/v1/workspace/enrolled-subjects", headers=student_a_headers)
    assert enrolled_res.status_code == 200
    enrolled_list = enrolled_res.json()
    assert any(s["id"] == science_subj["id"] for s in enrolled_list)

    # 3. Check Academic Workspace overview
    workspace_res = client.get("/api/v1/workspace", headers=student_a_headers)
    assert workspace_res.status_code == 200
    workspace = workspace_res.json()
    assert "academic_identity" in workspace
    assert "materials_summary" in workspace
    assert "learning_tools" in workspace
    assert any(s["id"] == science_subj["id"] for s in workspace["enrolled_subjects"])
    assert workspace["starter_subjects_available"] >= 5

    # 4. Unenroll from subject
    unenroll_res = client.delete(
        f"/api/v1/workspace/enroll-subject/{science_subj['id']}",
        headers=student_a_headers,
    )
    assert unenroll_res.status_code == 200
    assert unenroll_res.json()["success"] is True

    # 5. Verify no longer enrolled
    after_unenroll = client.get("/api/v1/workspace/enrolled-subjects", headers=student_a_headers)
    assert not any(s["id"] == science_subj["id"] for s in after_unenroll.json())


def test_student_workspace_isolation(client, student_a_headers, student_b_headers):
    """Verifies that Student A's enrolled subjects are isolated from Student B."""
    client.put(
        "/api/v1/profile",
        json={"education_level": "class-6-10", "grade_level": "Class 8", "education_category": "middle"},
        headers=student_a_headers,
    )
    client.put(
        "/api/v1/profile",
        json={"education_level": "class-6-10", "grade_level": "Class 8", "education_category": "middle"},
        headers=student_b_headers,
    )

    subjects_res = client.get("/api/v1/learning/subjects?education_level=class-6-10")
    math_subj = next(s for s in subjects_res.json() if "mathematics" in s["slug"])

    # Student A enrolls in Mathematics
    client.post(
        "/api/v1/workspace/enroll-subject",
        json={"subject_id": math_subj["id"]},
        headers=student_a_headers,
    )

    # Student B checks enrolled subjects
    res_b = client.get("/api/v1/workspace/enrolled-subjects", headers=student_b_headers)
    assert res_b.status_code == 200
    assert not any(s["id"] == math_subj["id"] for s in res_b.json())

    # Student B cannot unenroll Student A's enrollment
    unenroll_b = client.delete(
        f"/api/v1/workspace/enroll-subject/{math_subj['id']}",
        headers=student_b_headers,
    )
    assert unenroll_b.status_code == 404
