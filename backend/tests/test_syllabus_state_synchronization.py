import io
import os
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.db.session import SessionLocal
from app.models.profile import UserProfile
from app.models.syllabus import Syllabus, SyllabusVersion
from app.models.documents import Document
from app.core.security import SecurityContext
from app.services.syllabus.state_resolver import SyllabusStateResolver


@pytest.fixture
def sync_test_users(db_session):
    """Sets up two isolated test users with academic profiles."""
    user_a_id = "sync_user_a_11111111_2222_3333_444444444444"
    user_b_id = "sync_user_b_55555555_6666_7777_888888888888"

    # Clean prior records if any
    db_session.query(Document).filter(Document.user_id.in_([user_a_id, user_b_id])).delete()
    db_session.query(Syllabus).filter(Syllabus.user_id.in_([user_a_id, user_b_id])).delete()
    db_session.query(UserProfile).filter(UserProfile.id.in_([user_a_id, user_b_id])).delete()
    db_session.commit()

    profile_a = UserProfile(
        id=user_a_id,
        email="sync_student_a@nexora.edu",
        full_name="Sync Student A",
        education_level="undergraduate",
        degree="B.Tech",
        department="Computer Science",
        academic_year="Year 3",
        institution="Apex Tech University",
    )
    profile_b = UserProfile(
        id=user_b_id,
        email="sync_student_b@nexora.edu",
        full_name="Sync Student B",
        education_level="undergraduate",
        degree="B.Sc",
        department="Physics",
        academic_year="Year 2",
        institution="Royal Science College",
    )
    db_session.add(profile_a)
    db_session.add(profile_b)
    db_session.commit()

    token_a = SecurityContext.create_test_jwt(user_id=user_a_id, email=profile_a.email)
    token_b = SecurityContext.create_test_jwt(user_id=user_b_id, email=profile_b.email)

    return {
        "user_a": {"id": user_a_id, "token": token_a, "profile": profile_a},
        "user_b": {"id": user_b_id, "token": token_b, "profile": profile_b},
    }


def auth_header(token: str):
    return {"Authorization": f"Bearer {token}"}


# 1. State A: Initial Empty State (No Syllabus)
def test_state_a_canonical_state_endpoint(client: TestClient, sync_test_users):
    user_a = sync_test_users["user_a"]
    res = client.get("/api/v1/syllabi/state", headers=auth_header(user_a["token"]))
    assert res.status_code == 200, res.text
    payload = res.json()

    assert payload["has_syllabus"] is False
    assert payload["upload_status"] is None
    assert payload["processing_status"] == "not_started"
    assert payload["curriculum_status"] == "none"
    assert payload["is_curriculum_active"] is False
    assert payload["current_version_id"] is None
    assert payload["active_version_number"] is None


# 2. State A: Alias endpoint /api/v1/syllabus/state
def test_state_a_alias_endpoint(client: TestClient, sync_test_users):
    user_a = sync_test_users["user_a"]
    res = client.get("/api/v1/syllabus/state", headers=auth_header(user_a["token"]))
    assert res.status_code == 200, res.text
    payload = res.json()
    assert payload["has_syllabus"] is False
    assert payload["is_curriculum_active"] is False


# 3. State A: Workspace endpoint consistency
def test_state_a_workspace_consistency(client: TestClient, sync_test_users):
    user_a = sync_test_users["user_a"]
    res = client.get("/api/v1/workspace", headers=auth_header(user_a["token"]))
    assert res.status_code == 200, res.text
    payload = res.json()

    assert "syllabus_state" in payload
    assert payload["syllabus_state"]["has_syllabus"] is False
    assert payload["syllabus_state"]["is_curriculum_active"] is False
    assert payload["enrolled_subjects"] == []


# 4. State B: Transition on Syllabus Upload (Uploaded, Pre-Activation)
def test_state_b_upload_and_canonical_state(client: TestClient, sync_test_users, db_session):
    user_a = sync_test_users["user_a"]
    pdf_bytes = b"%PDF-1.4 Data Structures and Algorithms Official University Syllabus"
    files = {"file": ("dsa_syllabus.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
    data = {"title": "Data Structures & Algorithms"}

    upload_res = client.post("/api/v1/syllabi", files=files, data=data, headers=auth_header(user_a["token"]))
    assert upload_res.status_code == 201, upload_res.text
    upload_payload = upload_res.json()
    version_id = upload_payload["version_id"]

    # Verify Database Columns
    db_version = db_session.query(SyllabusVersion).filter(SyllabusVersion.id == version_id).first()
    assert db_version is not None
    assert db_version.upload_status == "verified"
    assert db_version.processing_status == "not_started"
    assert db_version.curriculum_status == "not_built"

    # Verify Document Record
    doc = db_session.query(Document).filter(Document.id == db_version.document_id).first()
    assert doc is not None
    assert doc.document_role == "syllabus"
    assert doc.processing_stage == "uploaded"
    assert doc.progress_percent == 100
    assert doc.status == "uploaded"

    # Verify Storage Object on disk
    assert os.path.exists(doc.file_path)
    assert os.path.getsize(doc.file_path) == len(pdf_bytes)

    # Verify Canonical State API
    state_res = client.get("/api/v1/syllabi/state", headers=auth_header(user_a["token"]))
    assert state_res.status_code == 200, state_res.text
    state_payload = state_res.json()

    assert state_payload["has_syllabus"] is True
    assert state_payload["upload_status"] == "verified"
    assert state_payload["processing_status"] == "not_started"
    assert state_payload["curriculum_status"] == "not_built"
    assert state_payload["is_curriculum_active"] is False
    assert state_payload["current_version_id"] == version_id
    assert state_payload["active_version_number"] == 1


# 5. State B: Materials API Document Classification
def test_state_b_materials_api_classification(client: TestClient, sync_test_users):
    user_a = sync_test_users["user_a"]
    # Upload syllabus first
    pdf_bytes = b"%PDF-1.4 Machine Learning Syllabus Course Outline"
    files = {"file": ("ml_syllabus.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
    data = {"title": "Machine Learning"}
    client.post("/api/v1/syllabi", files=files, data=data, headers=auth_header(user_a["token"]))

    docs_res = client.get("/api/v1/documents", headers=auth_header(user_a["token"]))
    assert docs_res.status_code == 200, docs_res.text
    docs = docs_res.json()
    assert len(docs) >= 1

    syllabus_doc = next((d for d in docs if d["document_role"] == "syllabus"), None)
    assert syllabus_doc is not None
    assert syllabus_doc["processing_stage"] == "uploaded"
    assert syllabus_doc["status"] == "uploaded"
    assert syllabus_doc["progress_percent"] == 100
    assert syllabus_doc["syllabus_id"] is not None
    assert syllabus_doc["syllabus_version_id"] is not None


# 6. State B: Workspace API Suppression of Fake Subjects
def test_state_b_workspace_suppression(client: TestClient, sync_test_users):
    user_a = sync_test_users["user_a"]
    pdf_bytes = b"%PDF-1.4 Operating Systems Syllabus Course Outline"
    files = {"file": ("os_syllabus.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
    data = {"title": "Operating Systems"}
    client.post("/api/v1/syllabi", files=files, data=data, headers=auth_header(user_a["token"]))

    ws_res = client.get("/api/v1/workspace", headers=auth_header(user_a["token"]))
    assert ws_res.status_code == 200, ws_res.text
    ws = ws_res.json()

    assert ws["syllabus_state"]["has_syllabus"] is True
    assert ws["syllabus_state"]["is_curriculum_active"] is False
    assert ws["enrolled_subjects"] == []


# 7. State C: Review Required / Draft State
def test_state_c_review_required(client: TestClient, sync_test_users, db_session):
    user_a = sync_test_users["user_a"]
    pdf_bytes = b"%PDF-1.4 State C Syllabus"
    files = {"file": ("state_c_syllabus.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
    upload_res = client.post("/api/v1/syllabi", files=files, headers=auth_header(user_a["token"]))
    version_id = upload_res.json()["version_id"]

    # Manually transition curriculum_status to 'review_required'
    version = db_session.query(SyllabusVersion).filter(SyllabusVersion.id == version_id).first()
    version.curriculum_status = "review_required"
    db_session.commit()

    state_res = client.get("/api/v1/syllabi/state", headers=auth_header(user_a["token"]))
    assert state_res.status_code == 200
    state = state_res.json()
    assert state["has_syllabus"] is True
    assert state["curriculum_status"] == "review_required"
    assert state["is_curriculum_active"] is False


# 8. State D: Curriculum Activated State
def test_state_d_curriculum_activated(client: TestClient, sync_test_users, db_session):
    user_a = sync_test_users["user_a"]
    pdf_bytes = b"%PDF-1.4 State D Syllabus"
    files = {"file": ("state_d_syllabus.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
    upload_res = client.post("/api/v1/syllabi", files=files, headers=auth_header(user_a["token"]))
    version_id = upload_res.json()["version_id"]

    # Manually transition curriculum_status to 'active'
    version = db_session.query(SyllabusVersion).filter(SyllabusVersion.id == version_id).first()
    version.curriculum_status = "active"
    version.is_active = True
    db_session.commit()

    state_res = client.get("/api/v1/syllabi/state", headers=auth_header(user_a["token"]))
    assert state_res.status_code == 200
    state = state_res.json()
    assert state["has_syllabus"] is True
    assert state["curriculum_status"] == "active"
    assert state["is_curriculum_active"] is True


# 9. Storage Object Consistency & Missing File Detection
def test_storage_missing_file_detection(client: TestClient, sync_test_users, db_session):
    user_a = sync_test_users["user_a"]
    pdf_bytes = b"%PDF-1.4 Temporary Syllabus for Missing File Test"
    files = {"file": ("temp_syllabus.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
    upload_res = client.post("/api/v1/syllabi", files=files, headers=auth_header(user_a["token"]))
    version_id = upload_res.json()["version_id"]

    db_version = db_session.query(SyllabusVersion).filter(SyllabusVersion.id == version_id).first()
    doc = db_session.query(Document).filter(Document.id == db_version.document_id).first()
    assert os.path.exists(doc.file_path)

    # Delete physical file from disk to simulate storage loss
    os.remove(doc.file_path)
    assert not os.path.exists(doc.file_path)

    # Resolver should detect missing physical storage
    state_res = client.get("/api/v1/syllabi/state", headers=auth_header(user_a["token"]))
    assert state_res.status_code == 200
    state = state_res.json()
    assert state["upload_status"] == "missing_file"


# 10. Cross-User and Cross-Context Isolation
def test_cross_user_state_isolation(client: TestClient, sync_test_users):
    user_a = sync_test_users["user_a"]
    user_b = sync_test_users["user_b"]

    # User A uploads syllabus
    pdf_bytes = b"%PDF-1.4 User A Private Syllabus"
    files = {"file": ("user_a_syllabus.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
    client.post("/api/v1/syllabi", files=files, headers=auth_header(user_a["token"]))

    # User A has syllabus
    state_a = client.get("/api/v1/syllabi/state", headers=auth_header(user_a["token"])).json()
    assert state_a["has_syllabus"] is True
    assert state_a["upload_status"] == "verified"

    # User B MUST NOT see User A's syllabus
    state_b = client.get("/api/v1/syllabi/state", headers=auth_header(user_b["token"])).json()
    assert state_b["has_syllabus"] is False
    assert state_b["curriculum_status"] == "none"
    assert state_b["is_curriculum_active"] is False
