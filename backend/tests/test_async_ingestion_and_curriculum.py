import io
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import SecurityContext


@pytest.fixture
def auth_headers():
    token = SecurityContext.create_test_jwt(user_id="test-student-curriculum-uuid", email="curriculum.student@nexora.edu")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def other_auth_headers():
    token = SecurityContext.create_test_jwt(user_id="other-student-uuid", email="other.student@nexora.edu")
    return {"Authorization": f"Bearer {token}"}


def test_list_curricula_unauthenticated_accessible(client):
    response = client.get("/api/v1/learning/curricula")
    assert response.status_code == 200
    curricula = response.json()
    assert len(curricula) >= 7
    codes = [c["code"] for c in curricula]
    assert "cbse-secondary" in codes
    assert "univ-eng-cse" in codes
    assert "tn-state-board" in codes


def test_filter_curricula_by_education_level(client):
    response = client.get("/api/v1/learning/curricula?education_level=class-6-10")
    assert response.status_code == 200
    curricula = response.json()
    assert len(curricula) >= 3
    for c in curricula:
        assert c["education_level"] == "class-6-10"


def test_update_student_profile_with_curriculum_and_grade(client, auth_headers):
    # Get CBSE secondary curriculum id
    curricula_res = client.get("/api/v1/learning/curricula?education_level=class-6-10")
    cbse_curr = next(c for c in curricula_res.json() if "cbse" in c["code"])

    # Update profile with secondary education level and curriculum
    update_payload = {
        "education_level": "class-6-10",
        "curriculum_id": cbse_curr["id"],
        "grade_level": "Class 8",
        "academic_domain": "General Science & Mathematics",
    }
    res = client.put("/api/v1/profile", json=update_payload, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["education_level"] == "class-6-10"
    assert data["curriculum_id"] == cbse_curr["id"]
    assert data["grade_level"] == "Class 8"
    assert data["academic_domain"] == "General Science & Mathematics"


def test_async_document_upload_and_status(client, auth_headers, other_auth_headers):

    # 1. Upload mock PDF document
    file_content = b"%PDF-1.4 Mock Class 8 Science Chapter 11 Force and Pressure Content"
    files = {
        "file": ("class_8_science_force.pdf", io.BytesIO(file_content), "application/pdf")
    }
    data = {
        "title": "Class 8 Science - Force & Pressure",
        "language": "en",
    }
    upload_res = client.post("/api/v1/documents/upload", files=files, data=data, headers=auth_headers)
    assert upload_res.status_code == 202
    upload_data = upload_res.json()
    doc_id = upload_data["id"]
    assert upload_data["status"] in ["queued", "processing", "completed"]
    assert "/status" in upload_data["status_url"]

    # 2. Check Document Status
    status_res = client.get(f"/api/v1/documents/{doc_id}/status", headers=auth_headers)
    assert status_res.status_code == 200
    status_data = status_res.json()
    assert status_data["id"] == doc_id
    assert status_data["progress_percent"] >= 0

    # 3. Verify Document in user's list
    list_res = client.get("/api/v1/documents", headers=auth_headers)
    assert list_res.status_code == 200
    docs = list_res.json()
    assert any(d["id"] == doc_id for d in docs)

    # 4. Strict Security: Other student CANNOT access or see this document
    other_list_res = client.get("/api/v1/documents", headers=other_auth_headers)
    assert other_list_res.status_code == 200
    other_docs = other_list_res.json()
    assert not any(d["id"] == doc_id for d in other_docs)

    other_status_res = client.get(f"/api/v1/documents/{doc_id}/status", headers=other_auth_headers)
    assert other_status_res.status_code == 404

    # 5. Delete document
    del_res = client.delete(f"/api/v1/documents/{doc_id}", headers=auth_headers)
    assert del_res.status_code == 200

    # Verify deleted
    status_after_del = client.get(f"/api/v1/documents/{doc_id}/status", headers=auth_headers)
    assert status_after_del.status_code == 404
