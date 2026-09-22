import uuid
import pytest
from app.core.security import SecurityContext
from app.models.profile import UserProfile
from app.services.profile.completion_service import ProfileCompletionService


# ==============================================================================
# TEST MATRIX A & B: Home completion == Profile completion & Dynamic Update Sync
# ==============================================================================

def test_home_completion_equals_profile_completion(client, db_session):
    """
    Test A & B:
    1. Home page and Profile page calculate completion using identical canonical logic.
    2. Changing a required field dynamically updates both simultaneously.
    """
    user_id = str(uuid.uuid4())
    user_email = f"student_{uuid.uuid4().hex[:8]}@example.com"
    token = SecurityContext.create_test_jwt(user_id=user_id, email=user_email)
    headers = {"Authorization": f"Bearer {token}"}

    # Step 1: Initialize undergraduate student profile with all required fields
    init_payload = {
        "full_name": "Priya Sharma",
        "education_level": "undergraduate",
        "education_category": "undergraduate",
        "degree": "B.Tech",
        "department": "Computer Science & Engineering",
        "academic_year": "Year 3",
        "specialization": None,  # optional!
    }
    put_res = client.put("/api/v1/profile", json=init_payload, headers=headers)
    assert put_res.status_code == 200

    # Step 2: Compare Profile endpoint vs Workspace endpoint
    prof_res = client.get("/api/v1/profile", headers=headers)
    assert prof_res.status_code == 200
    prof_data = prof_res.json()

    ws_res = client.get("/api/v1/workspace", headers=headers)
    assert ws_res.status_code == 200
    ws_data = ws_res.json()

    # Both must report exact same completion score and state
    assert prof_data["completeness_score"] == 100
    assert prof_data["profile_completeness"]["score"] == 100
    assert prof_data["profile_completeness"]["is_complete"] is True

    assert ws_data["profile_completeness"]["score"] == 100
    assert ws_data["profile_completeness"]["is_complete"] is True
    assert ws_data["profile_completeness"]["score"] == prof_data["completeness_score"]

    # Step 3: Test B - Remove a required field (department) and verify BOTH update identically
    upd_res = client.put(
        "/api/v1/profile",
        json={"department": None},
        headers=headers,
    )
    assert upd_res.status_code == 200

    prof_res_upd = client.get("/api/v1/profile", headers=headers)
    ws_res_upd = client.get("/api/v1/workspace", headers=headers)

    prof_upd = prof_res_upd.json()
    ws_upd = ws_res_upd.json()

    # 4 out of 5 required fields passed: 4/5 = 80%
    assert prof_upd["completeness_score"] == 80
    assert prof_upd["profile_completeness"]["is_complete"] is False
    assert "department" in prof_upd["profile_completeness"]["missing_fields"]

    assert ws_upd["profile_completeness"]["score"] == 80
    assert ws_upd["profile_completeness"]["is_complete"] is False
    assert ws_upd["profile_completeness"]["score"] == prof_upd["completeness_score"]
    assert "department" in ws_upd["profile_completeness"]["missing_fields"]


# ==============================================================================
# TEST MATRIX C: Optional specialization does not make complete profile incomplete
# ==============================================================================

def test_optional_specialization_does_not_reduce_completion(client):
    """
    Test C:
    An undergraduate student with name, academic_level, degree, department, year/semester
    must have 100% completion regardless of whether specialization is empty or populated.
    """
    user_id = str(uuid.uuid4())
    token = SecurityContext.create_test_jwt(user_id=user_id, email=f"ug_{uuid.uuid4().hex[:8]}@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    # Complete required fields without specialization
    client.put(
        "/api/v1/profile",
        json={
            "full_name": "Rohan Patel",
            "education_level": "undergraduate",
            "education_category": "undergraduate",
            "degree": "B.Tech",
            "department": "Mechanical Engineering",
            "academic_year": "Semester 5",
            "specialization": None,
        },
        headers=headers,
    )

    prof = client.get("/api/v1/profile", headers=headers).json()
    assert prof["completeness_score"] == 100
    assert prof["profile_completeness"]["is_complete"] is True
    assert prof["specialization"] is None

    # Adding specialization keeps it 100%
    client.put("/api/v1/profile", json={"specialization": "Robotics & Automation"}, headers=headers)
    prof2 = client.get("/api/v1/profile", headers=headers).json()
    assert prof2["completeness_score"] == 100
    assert prof2["profile_completeness"]["is_complete"] is True
    assert prof2["specialization"] == "Robotics & Automation"


# ==============================================================================
# TEST MATRIX D: School profile does not require higher education fields
# ==============================================================================

def test_school_profile_does_not_require_higher_education_fields(client):
    """
    Test D:
    School student requires name, academic level, grade, board (and state if state board).
    It does NOT require degree, department, or specialization.
    """
    user_id = str(uuid.uuid4())
    token = SecurityContext.create_test_jwt(user_id=user_id, email=f"school_{uuid.uuid4().hex[:8]}@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    # School profile with national board (CBSE)
    client.put(
        "/api/v1/profile",
        json={
            "full_name": "Aarav Kumar",
            "education_level": "class-6-10",
            "education_category": "secondary",
            "grade_level": "Class 10",
            "board_type": "national",
            "curriculum_id": "cur-00000000-0000-0000-0000-000000000002",
            "degree": None,
            "department": None,
            "specialization": None,
        },
        headers=headers,
    )

    prof = client.get("/api/v1/profile", headers=headers).json()
    assert prof["completeness_score"] == 100
    assert prof["profile_completeness"]["is_complete"] is True
    assert len(prof["missing_fields"]) == 0


# ==============================================================================
# TEST MATRIX E: Higher education profile does not require school-only fields
# ==============================================================================

def test_higher_education_does_not_require_school_fields(client):
    """
    Test E:
    University student requires name, academic level, degree, department, year.
    It does NOT require school curriculum/board or school grade levels.
    """
    user_id = str(uuid.uuid4())
    token = SecurityContext.create_test_jwt(user_id=user_id, email=f"univ_{uuid.uuid4().hex[:8]}@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    client.put(
        "/api/v1/profile",
        json={
            "full_name": "Elena Rostova",
            "education_level": "postgraduate",
            "education_category": "postgraduate",
            "degree": "M.S.",
            "department": "Artificial Intelligence",
            "academic_year": "Year 1",
            "curriculum_id": None,
            "board_type": None,
            "grade_level": None,
        },
        headers=headers,
    )

    prof = client.get("/api/v1/profile", headers=headers).json()
    assert prof["completeness_score"] == 100
    assert prof["profile_completeness"]["is_complete"] is True


# ==============================================================================
# TEST MATRIX F, G, H: Zero Default Academic Values & Clean Domains
# ==============================================================================

def test_zero_default_academic_values_and_no_general_studies(client):
    """
    Test F, G, H:
    1. Empty academic discipline/domain remains empty / null.
    2. 'General Studies' is NEVER auto-inserted.
    3. No default academic discipline or fake fill values are assigned.
    """
    user_id = str(uuid.uuid4())
    token = SecurityContext.create_test_jwt(user_id=user_id, email=f"clean_{uuid.uuid4().hex[:8]}@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    # Initial profile access
    prof = client.get("/api/v1/profile", headers=headers).json()
    assert prof["academic_domain"] is None
    assert prof["academic_domain"] != "General Studies"

    # Workspace overview access
    ws = client.get("/api/v1/workspace", headers=headers).json()
    assert ws["academic_identity"]["academic_domain"] is None
    assert ws["academic_identity"]["academic_domain"] != "General Studies"


# ==============================================================================
# TEST MATRIX I & K: Unknown Google Account Rejection & No Orphan Profiles
# ==============================================================================

def test_unknown_google_account_rejected_without_orphan_profile(client, db_session):
    """
    Test I & K:
    1. Unknown Google account cannot authenticate or auto-create a NEXORA account.
    2. Blocked Google signup leaves no orphan auth/profile/workspace data.
    """
    unknown_uuid = str(uuid.uuid4())
    unknown_email = "stranger.unknown@gmail.com"

    token_google = SecurityContext.create_test_jwt(
        user_id=unknown_uuid,
        email=unknown_email,
        role="student",
        provider="google",
        identities=["google"],
    )
    headers = {"Authorization": f"Bearer {token_google}"}

    # Attempting to fetch profile as unknown Google user is rejected with 404
    res = client.get("/api/v1/profile", headers=headers)
    assert res.status_code == 404
    assert "Account not found" in res.json()["detail"]
    assert "Create a NEXORA account first" in res.json()["detail"]

    # Verify no orphan row exists in database
    db_profile = db_session.query(UserProfile).filter(UserProfile.id == unknown_uuid).first()
    assert db_profile is None

    db_profile_email = db_session.query(UserProfile).filter(UserProfile.email == unknown_email).first()
    assert db_profile_email is None


# ==============================================================================
# TEST MATRIX J: Same UUID Retention Across Multi-Provider Sign-in
# ==============================================================================

def test_existing_nexora_account_retains_same_uuid_with_google(client, db_session):
    """
    Test J:
    When an account is first created in NEXORA, subsequent Google sign-in with the same
    verified email preserves the exact same Supabase user UUID.
    """
    user_uuid = str(uuid.uuid4())
    user_email = "verified.student@gmail.com"

    # Step 1: Student creates NEXORA account
    token_email = SecurityContext.create_test_jwt(
        user_id=user_uuid,
        email=user_email,
        provider="email",
        identities=["email"],
    )
    create_res = client.put(
        "/api/v1/profile",
        json={"full_name": "Verified Student", "education_level": "undergraduate"},
        headers={"Authorization": f"Bearer {token_email}"},
    )
    assert create_res.status_code == 200

    # Step 2: Student signs in via Google OAuth
    token_google = SecurityContext.create_test_jwt(
        user_id=user_uuid,
        email=user_email,
        provider="google",
        identities=["email", "google"],
    )
    goog_res = client.get("/api/v1/profile", headers={"Authorization": f"Bearer {token_google}"})
    assert goog_res.status_code == 200
    assert goog_res.json()["id"] == user_uuid
    assert goog_res.json()["full_name"] == "Verified Student"

    # Exactly one profile record in the database
    rows = db_session.query(UserProfile).filter(UserProfile.email == user_email).all()
    assert len(rows) == 1
    assert rows[0].id == user_uuid


# ==============================================================================
# TEST MATRIX L: Logout / Login Preserves Canonical Profile Completion
# ==============================================================================

def test_logout_and_login_preserves_profile_completion(client):
    """
    Test L:
    Completing a profile, logging out, and logging in again preserves the exact
    canonical profile completion score on both Home and Profile without stale state.
    """
    user_id = str(uuid.uuid4())
    token_session_1 = SecurityContext.create_test_jwt(user_id=user_id, email=f"persist_{uuid.uuid4().hex[:8]}@example.com")

    # Complete undergraduate profile
    client.put(
        "/api/v1/profile",
        json={
            "full_name": "Vikram Seth",
            "education_level": "undergraduate",
            "education_category": "undergraduate",
            "degree": "B.Tech",
            "department": "Electrical Engineering",
            "academic_year": "Year 4",
        },
        headers={"Authorization": f"Bearer {token_session_1}"},
    )

    # Verify 100% in session 1
    p1 = client.get("/api/v1/profile", headers={"Authorization": f"Bearer {token_session_1}"}).json()
    w1 = client.get("/api/v1/workspace", headers={"Authorization": f"Bearer {token_session_1}"}).json()
    assert p1["completeness_score"] == 100
    assert w1["profile_completeness"]["score"] == 100

    # Simulate logout and re-login under session 2 (new JWT token for same user UUID)
    token_session_2 = SecurityContext.create_test_jwt(user_id=user_id)
    p2 = client.get("/api/v1/profile", headers={"Authorization": f"Bearer {token_session_2}"}).json()
    w2 = client.get("/api/v1/workspace", headers={"Authorization": f"Bearer {token_session_2}"}).json()

    assert p2["completeness_score"] == 100
    assert w2["profile_completeness"]["score"] == 100
    assert p2["completeness_score"] == w2["profile_completeness"]["score"]
