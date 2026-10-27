import io
import os
import hashlib
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.db.session import SessionLocal
from app.models.profile import UserProfile
from app.models.syllabus import Syllabus, SyllabusVersion
from app.models.documents import Document
from app.models.learning import Subject, Topic, Concept, LearningModule, Lesson
from app.core.security import SecurityContext


@pytest.fixture
def test_users(db_session):
    """Sets up two isolated test users with student profiles."""
    user_a_id = "02r_user_a_11111111_2222_3333_444444444444"
    user_b_id = "02r_user_b_55555555_6666_7777_888888888888"

    # Clean prior records if any
    db_session.query(Document).filter(Document.user_id.in_([user_a_id, user_b_id])).delete()
    db_session.query(Syllabus).filter(Syllabus.user_id.in_([user_a_id, user_b_id])).delete()
    db_session.query(UserProfile).filter(UserProfile.id.in_([user_a_id, user_b_id])).delete()
    db_session.commit()

    profile_a = UserProfile(
        id=user_a_id,
        email="student_a_02r@nexora.edu",
        full_name="Alex Student A",
        education_level="undergraduate",
        degree="B.Tech",
        department="Computer Science",
        academic_year="Year 3",
        institution="Apex Tech University",
    )
    profile_b = UserProfile(
        id=user_b_id,
        email="student_b_02r@nexora.edu",
        full_name="Blake Student B",
        education_level="undergraduate",
        degree="B.Sc",
        department="Mathematics",
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


# 1. Authenticated syllabus upload
def test_req_01_authenticated_syllabus_upload(client: TestClient, test_users):
    user_a = test_users["user_a"]
    file_bytes = b"%PDF-1.4 Mock syllabus content for CS301 Database Systems and Architecture."
    files = {"file": ("cs301_syllabus.pdf", io.BytesIO(file_bytes), "application/pdf")}
    data = {"title": "CS301 Database Systems"}

    res = client.post("/api/v1/syllabi", files=files, data=data, headers=auth_header(user_a["token"]))
    assert res.status_code == 201, res.text
    payload = res.json()
    assert payload["syllabus_id"] is not None
    assert payload["version_id"] is not None
    assert payload["version_number"] == 1
    assert payload["status"] == "uploaded"
    assert payload["title"] == "CS301 Database Systems"
    assert payload["filename"] == "cs301_syllabus.pdf"
    assert payload["is_duplicate"] is False


# 2. Unauthenticated upload rejection
def test_req_02_unauthenticated_upload_rejection(client: TestClient):
    files = {"file": ("syllabus.pdf", io.BytesIO(b"content"), "application/pdf")}
    res = client.post("/api/v1/syllabi", files=files)
    assert res.status_code == 401


# 3. Valid file acceptance (PDF, DOCX, PPTX, TXT, JPG, PNG)
@pytest.mark.parametrize(
    "filename,mime,content",
    [
        ("syllabus.pdf", "application/pdf", b"%PDF-1.4 test document content"),
        ("syllabus.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", b"PK\x03\x04 mock docx"),
        ("syllabus.pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation", b"PK\x03\x04 mock pptx"),
        ("syllabus.txt", "text/plain", b"Course description and topics outline"),
        ("syllabus.jpg", "image/jpeg", b"\xff\xd8\xff mock jpeg bytes"),
        ("syllabus.png", "image/png", b"\x89PNG\r\n\x1a\n mock png bytes"),
    ],
)
def test_req_03_valid_file_formats_accepted(client: TestClient, test_users, filename, mime, content):
    user_a = test_users["user_a"]
    files = {"file": (filename, io.BytesIO(content), mime)}
    res = client.post("/api/v1/syllabi", files=files, headers=auth_header(user_a["token"]))
    assert res.status_code == 201, f"Failed for {filename}: {res.text}"


# 4. Unsupported file rejection
@pytest.mark.parametrize("filename", ["malware.exe", "script.sh", "code.py", "archive.zip", "data.bin"])
def test_req_04_unsupported_file_rejection(client: TestClient, test_users, filename):
    user_a = test_users["user_a"]
    files = {"file": (filename, io.BytesIO(b"executable content"), "application/octet-stream")}
    res = client.post("/api/v1/syllabi", files=files, headers=auth_header(user_a["token"]))
    assert res.status_code == 400
    assert "Unsupported syllabus file format" in res.json()["detail"]


# 5. Oversized and empty file rejection
def test_req_05_oversized_and_empty_file_rejection(client: TestClient, test_users):
    user_a = test_users["user_a"]
    # 0-byte empty file
    files_empty = {"file": ("empty.pdf", io.BytesIO(b""), "application/pdf")}
    res_empty = client.post("/api/v1/syllabi", files=files_empty, headers=auth_header(user_a["token"]))
    assert res_empty.status_code == 400
    assert "empty (0 bytes)" in res_empty.json()["detail"]

    # Oversized file (>50MB check)
    large_bytes = b"X" * (50 * 1024 * 1024 + 1024)
    files_large = {"file": ("large.pdf", io.BytesIO(large_bytes), "application/pdf")}
    res_large = client.post("/api/v1/syllabi", files=files_large, headers=auth_header(user_a["token"]))
    assert res_large.status_code == 413


# 6. Syllabus record creation
# 7. Syllabus version creation
# 8. Document role is syllabus
# 9. User ownership enforcement
# 10. Academic context association
def test_req_06_to_10_database_records_and_metadata(client: TestClient, test_users, db_session):
    user_a = test_users["user_a"]
    file_bytes = b"%PDF-1.4 Unique operating systems syllabus content batch 2026."
    files = {"file": ("os_syllabus.pdf", io.BytesIO(file_bytes), "application/pdf")}
    data = {"title": "Operating Systems Syllabus"}

    res = client.post("/api/v1/syllabi", files=files, data=data, headers=auth_header(user_a["token"]))
    assert res.status_code == 201
    payload = res.json()

    # Verify Syllabus model
    syl = db_session.query(Syllabus).filter(Syllabus.id == payload["syllabus_id"]).first()
    assert syl is not None
    assert syl.user_id == user_a["id"]  # 9. Ownership
    assert syl.title == "Operating Systems Syllabus"
    assert syl.academic_level == "undergraduate"
    assert syl.academic_context_id is not None  # 10. Academic Context Association
    assert syl.status == "uploaded"

    # Verify SyllabusVersion model
    ver = db_session.query(SyllabusVersion).filter(SyllabusVersion.id == payload["version_id"]).first()
    assert ver is not None  # 7. Version record creation
    assert ver.syllabus_id == syl.id
    assert ver.version_number == 1
    assert ver.status == "uploaded"
    assert ver.checksum == hashlib.sha256(file_bytes).hexdigest()
    assert ver.file_size_bytes == len(file_bytes)
    assert ver.source_filename == "os_syllabus.pdf"

    # Verify Document model (8. document_role = 'syllabus')
    doc = db_session.query(Document).filter(Document.id == payload["document_id"]).first()
    assert doc is not None
    assert doc.document_role == "syllabus"
    assert doc.syllabus_id == syl.id
    assert doc.syllabus_version_id == ver.id
    assert doc.user_id == user_a["id"]


# 11. Cross-user read rejection
# 12. Cross-user modification and deletion rejection
def test_req_11_and_12_cross_user_isolation(client: TestClient, test_users):
    user_a = test_users["user_a"]
    user_b = test_users["user_b"]

    # User A uploads a syllabus
    files = {"file": ("user_a_syllabus.pdf", io.BytesIO(b"%PDF user a syllabus"), "application/pdf")}
    res_upload = client.post("/api/v1/syllabi", files=files, headers=auth_header(user_a["token"]))
    assert res_upload.status_code == 201
    syl_id = res_upload.json()["syllabus_id"]
    ver_id = res_upload.json()["version_id"]

    # User B tries to read User A's syllabus
    res_b_read = client.get(f"/api/v1/syllabi/{syl_id}", headers=auth_header(user_b["token"]))
    assert res_b_read.status_code == 404

    # User B tries to read versions of User A's syllabus
    res_b_vers = client.get(f"/api/v1/syllabi/{syl_id}/versions", headers=auth_header(user_b["token"]))
    assert res_b_vers.status_code == 404

    # User B tries to upload a new version to User A's syllabus
    new_files = {"file": ("hack.pdf", io.BytesIO(b"%PDF malicious"), "application/pdf")}
    res_b_mod = client.post(f"/api/v1/syllabi/{syl_id}/versions", files=new_files, headers=auth_header(user_b["token"]))
    assert res_b_mod.status_code == 404

    # User B tries to delete User A's syllabus
    res_b_del = client.delete(f"/api/v1/syllabi/{syl_id}", headers=auth_header(user_b["token"]))
    assert res_b_del.status_code == 404

    # User B tries to download User A's syllabus file
    res_b_dl = client.get(f"/api/v1/syllabi/{syl_id}/versions/{ver_id}/download", headers=auth_header(user_b["token"]))
    assert res_b_dl.status_code == 404


# 13. Cross-context isolation
def test_req_13_cross_context_isolation(client: TestClient, test_users):
    user_a = test_users["user_a"]

    # Upload for undergraduate context
    files_ug = {"file": ("ug_syllabus.pdf", io.BytesIO(b"%PDF undergraduate syllabus"), "application/pdf")}
    data_ug = {"academic_context_id": "undergraduate:apex_tech:btech_cse"}
    res_ug = client.post("/api/v1/syllabi", files=files_ug, data=data_ug, headers=auth_header(user_a["token"]))
    assert res_ug.status_code == 201
    ug_id = res_ug.json()["syllabus_id"]

    # Verify that listing syllabi filtered by level isolates correctly
    res_list_ug = client.get("/api/v1/syllabi?academic_level=undergraduate", headers=auth_header(user_a["token"]))
    assert res_list_ug.status_code == 200
    assert any(s["id"] == ug_id for s in res_list_ug.json())

    res_list_k12 = client.get("/api/v1/syllabi?academic_level=class_6_10", headers=auth_header(user_a["token"]))
    assert res_list_k12.status_code == 200
    assert not any(s["id"] == ug_id for s in res_list_k12.json())


# 14. Deterministic checksum generation
# 15. Duplicate file handling
def test_req_14_and_15_checksum_and_duplicate_detection(client: TestClient, test_users):
    user_a = test_users["user_a"]
    file_bytes = b"%PDF-1.4 Fixed syllabus content for duplicate hash verification test 12345."
    expected_hash = hashlib.sha256(file_bytes).hexdigest()

    # Initial upload
    files_1 = {"file": ("original.pdf", io.BytesIO(file_bytes), "application/pdf")}
    res_1 = client.post("/api/v1/syllabi", files=files_1, headers=auth_header(user_a["token"]))
    assert res_1.status_code == 201
    p1 = res_1.json()
    assert p1["checksum"] == expected_hash
    assert p1["is_duplicate"] is False

    # Second upload with identical content (even if different filename)
    files_2 = {"file": ("copy_of_syllabus.pdf", io.BytesIO(file_bytes), "application/pdf")}
    res_2 = client.post("/api/v1/syllabi", files=files_2, headers=auth_header(user_a["token"]))
    assert res_2.status_code == 201
    p2 = res_2.json()
    assert p2["is_duplicate"] is True
    assert p2["checksum"] == expected_hash
    assert p2["version_id"] == p1["version_id"]
    assert "Duplicate syllabus detected" in p2["message"]

    # Upload with different content but same filename -> accepted as new version!
    diff_content = b"%PDF-1.4 Modified curriculum content with revised topics."
    files_3 = {"file": ("original.pdf", io.BytesIO(diff_content), "application/pdf")}
    res_3 = client.post(f"/api/v1/syllabi/{p1['syllabus_id']}/versions", files=files_3, headers=auth_header(user_a["token"]))
    assert res_3.status_code == 201
    p3 = res_3.json()
    assert p3["is_duplicate"] is False
    assert p3["version_number"] > p1["version_number"]


# 16. Upload status persistence
# 17. Refresh persistence / API retrieval
def test_req_16_and_17_status_and_refresh_persistence(client: TestClient, test_users):
    user_a = test_users["user_a"]
    files = {"file": ("persist_test.pdf", io.BytesIO(b"%PDF persistence verification"), "application/pdf")}
    res = client.post("/api/v1/syllabi", files=files, headers=auth_header(user_a["token"]))
    assert res.status_code == 201
    syl_id = res.json()["syllabus_id"]
    ver_id = res.json()["version_id"]

    # Query multiple times (simulating browser page refresh)
    for _ in range(3):
        get_res = client.get(f"/api/v1/syllabi/{syl_id}", headers=auth_header(user_a["token"]))
        assert get_res.status_code == 200
        data = get_res.json()
        assert data["id"] == syl_id
        assert data["status"] == "uploaded"

        ver_res = client.get(f"/api/v1/syllabi/{syl_id}/versions/{ver_id}", headers=auth_header(user_a["token"]))
        assert ver_res.status_code == 200
        assert ver_res.json()["status"] == "uploaded"


# 18. NO automatic subject creation
# 19. NO automatic module creation
# 20. NO automatic practice creation
# 21. NO binary search fallback
# 22. NO default curriculum fallback
def test_req_18_to_22_zero_curriculum_creation_at_upload(client: TestClient, test_users, db_session):
    user_a = test_users["user_a"]
    files = {"file": ("strict_no_curriculum.pdf", io.BytesIO(b"%PDF strict invariant syllabus"), "application/pdf")}
    res = client.post("/api/v1/syllabi", files=files, headers=auth_header(user_a["token"]))
    assert res.status_code == 201

    # 18. Zero subjects created for this user
    user_subjects = db_session.query(Subject).filter(Subject.user_id == user_a["id"]).all()
    assert len(user_subjects) == 0

    # 19. Zero modules or concepts created for this user
    user_modules = (
        db_session.query(LearningModule)
        .join(Concept, LearningModule.concept_id == Concept.id)
        .join(Topic, Concept.topic_id == Topic.id)
        .join(Subject, Topic.subject_id == Subject.id)
        .filter(Subject.user_id == user_a["id"])
        .all()
    )
    assert len(user_modules) == 0

    # 20. Zero practice items created
    prac_res = client.get("/api/v1/learning/practice/sets", headers=auth_header(user_a["token"]))
    assert prac_res.status_code == 200
    assert prac_res.json() == []

    # 21. NO binary search fallback for ungrounded concepts
    explore_res = client.post("/api/v1/learning/explore", json={"query": "Quantum Cryptography Dynamics"}, headers=auth_header(user_a["token"]))
    assert explore_res.status_code == 404
    assert "not found" in explore_res.json()["detail"].lower()

    # 22. NO default curriculum fallback
    subjects_res = client.get("/api/v1/learning/subjects", headers=auth_header(user_a["token"]))
    assert subjects_res.status_code == 200
    assert subjects_res.json() == []


# 23. NO fake processing percentage
def test_req_23_no_fake_processing_percentage(client: TestClient, test_users):
    user_a = test_users["user_a"]
    files = {"file": ("truthful_status.pdf", io.BytesIO(b"%PDF truthful status check"), "application/pdf")}
    res = client.post("/api/v1/syllabi", files=files, headers=auth_header(user_a["token"]))
    assert res.status_code == 201
    payload = res.json()
    # Status is an honest discrete string, not a simulated percent
    assert payload["status"] in ["uploaded", "processing", "processed", "active"]


# 24. Version history retention
# 25. Active / archived lifecycle correctness
def test_req_24_and_25_version_history_and_lifecycle(client: TestClient, test_users):
    user_a = test_users["user_a"]

    # Upload v1
    files_v1 = {"file": ("syllabus_v1.pdf", io.BytesIO(b"%PDF v1 content"), "application/pdf")}
    res_v1 = client.post("/api/v1/syllabi", files=files_v1, headers=auth_header(user_a["token"]))
    syl_id = res_v1.json()["syllabus_id"]
    ver_1_id = res_v1.json()["version_id"]

    # Upload v2
    files_v2 = {"file": ("syllabus_v2.pdf", io.BytesIO(b"%PDF v2 revised content"), "application/pdf")}
    res_v2 = client.post(f"/api/v1/syllabi/{syl_id}/versions", files=files_v2, headers=auth_header(user_a["token"]))
    ver_2_id = res_v2.json()["version_id"]

    # 24. Both versions retained in history
    vers_res = client.get(f"/api/v1/syllabi/{syl_id}/versions", headers=auth_header(user_a["token"]))
    assert vers_res.status_code == 200
    versions = vers_res.json()
    assert len(versions) == 2
    ver_nums = [v["version_number"] for v in versions]
    assert 1 in ver_nums and 2 in ver_nums

    # 25. Activate version 2
    act_res = client.patch(f"/api/v1/syllabi/{syl_id}/versions/{ver_2_id}/activate", headers=auth_header(user_a["token"]))
    assert act_res.status_code == 200
    assert act_res.json()["status"] == "active"
    assert act_res.json()["active_version"]["id"] == ver_2_id

    # Verify v1 is not active
    v1_check = client.get(f"/api/v1/syllabi/{syl_id}/versions/{ver_1_id}", headers=auth_header(user_a["token"]))
    assert v1_check.json()["is_active"] is False

    # Archive v1
    arch_res = client.patch(f"/api/v1/syllabi/{syl_id}/versions/{ver_1_id}/archive", headers=auth_header(user_a["token"]))
    assert arch_res.status_code == 200
    assert arch_res.json()["status"] == "archived"


# 26. Storage access protection and secure authenticated download
def test_req_26_storage_download_access_protection(client: TestClient, test_users):
    user_a = test_users["user_a"]
    raw_content = b"%PDF-1.4 Protected syllabus file content for binary streaming test."
    files = {"file": ("secure_math.pdf", io.BytesIO(raw_content), "application/pdf")}
    res = client.post("/api/v1/syllabi", files=files, headers=auth_header(user_a["token"]))
    syl_id = res.json()["syllabus_id"]
    ver_id = res.json()["version_id"]

    # Authenticated download by owner -> succeeds with exact bytes
    dl_res = client.get(f"/api/v1/syllabi/{syl_id}/versions/{ver_id}/download", headers=auth_header(user_a["token"]))
    assert dl_res.status_code == 200
    assert dl_res.content == raw_content

    # Unauthenticated download -> 401
    anon_res = client.get(f"/api/v1/syllabi/{syl_id}/versions/{ver_id}/download")
    assert anon_res.status_code == 401


# 27. Malformed upload handling
def test_req_27_malformed_upload_handling(client: TestClient, test_users):
    user_a = test_users["user_a"]
    # Send request missing the required 'file' multipart field
    res = client.post("/api/v1/syllabi", data={"title": "No File Provided"}, headers=auth_header(user_a["token"]))
    assert res.status_code == 422


# 28. Failed processing handling (graceful error response)
def test_req_28_failed_processing_handling(client: TestClient, test_users):
    user_a = test_users["user_a"]
    # Request with invalid syllabus id returns 404 cleanly without 500 crash
    res = client.get("/api/v1/syllabi/nonexistent-uuid-9999", headers=auth_header(user_a["token"]))
    assert res.status_code == 404
    assert "Syllabus not found" in res.json()["detail"]


# 29. Logout / login persistence
def test_req_29_logout_login_persistence(client: TestClient, test_users):
    user_a = test_users["user_a"]
    files = {"file": ("session_test.pdf", io.BytesIO(b"%PDF session persistence check"), "application/pdf")}
    res = client.post("/api/v1/syllabi", files=files, headers=auth_header(user_a["token"]))
    syl_id = res.json()["syllabus_id"]

    # Re-mint new access token (simulating fresh login after logout)
    fresh_token = SecurityContext.create_test_jwt(user_id=user_a["id"], email=user_a["profile"].email)
    get_res = client.get(f"/api/v1/syllabi/{syl_id}", headers=auth_header(fresh_token))
    assert get_res.status_code == 200
    assert get_res.json()["id"] == syl_id


# 30. Empty syllabus state
def test_req_30_empty_syllabus_state(client: TestClient, test_users):
    user_b = test_users["user_b"]
    # User B has no uploaded syllabus yet
    res = client.get("/api/v1/syllabi", headers=auth_header(user_b["token"]))
    assert res.status_code == 200
    assert res.json() == []

    # Workspace overview reflects no active syllabus
    ws_res = client.get("/api/v1/workspace", headers=auth_header(user_b["token"]))
    assert ws_res.status_code == 200
    assert ws_res.json()["active_syllabus"] is None
