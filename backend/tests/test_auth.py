import pytest
from app.core.security import SecurityContext


def test_auth_me_unauthenticated(client):
    """Verifies that accessing /api/v1/auth/me without Authorization header returns 401."""
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401
    assert "detail" in response.json()


def test_auth_me_invalid_token(client):
    """Verifies that invalid or malformed token is rejected with 401."""
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer totally-invalid-token-value"}
    )
    assert response.status_code == 401


def test_auth_me_valid_signed_token(client):
    """Verifies that a valid signed JWT is correctly accepted with matching identity."""
    user_id = "11111111-2222-3333-4444-555555555555"
    token = SecurityContext.create_test_jwt(
        user_id=user_id,
        email="alex@nexora.edu",
        role="student",
        provider="email",
        identities=["email"],
    )

    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == user_id
    assert data["email"] == "alex@nexora.edu"
    assert data["role"] == "student"
    assert data["is_authenticated"] is True
    assert data["provider"] == "email"
    assert "email" in data["identities"]


def test_auth_me_google_oauth_identity(client):
    """Verifies that a Google OAuth identity JWT correctly conveys provider and linked identities."""
    user_id = "goog-1234-5678-90ab-cdef01234567"
    token = SecurityContext.create_test_jwt(
        user_id=user_id,
        email="student.google@gmail.com",
        role="student",
        provider="google",
        identities=["email", "google"],
    )

    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == user_id
    assert data["email"] == "student.google@gmail.com"
    assert data["provider"] == "google"
    assert "google" in data["identities"]
    assert "email" in data["identities"]


def test_auth_me_dev_token(client):
    """Verifies that development student token is accepted in local environments."""
    user_id = "00000000-0000-0000-0000-000000000001"
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer dev-student-{user_id}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == user_id
    assert data["is_authenticated"] is True
    assert data["provider"] == "email"


def test_profile_unauthenticated(client):
    """Verifies that /api/v1/profile rejects unauthenticated requests with 401."""
    response = client.get("/api/v1/profile")
    assert response.status_code == 401


def test_profile_lifecycle_and_user_scoping(client):
    """Verifies profile auto-provisioning, reading, and updating strictly scoped to authenticated user."""
    user_a_id = "aaaa0000-1111-2222-3333-444455556666"
    token_a = SecurityContext.create_test_jwt(user_id=user_a_id, email="user_a@nexora.edu")

    # 1. GET profile auto-provisions profile
    get_res = client.get("/api/v1/profile", headers={"Authorization": f"Bearer {token_a}"})
    assert get_res.status_code == 200
    profile_a = get_res.json()
    assert profile_a["id"] == user_a_id
    assert profile_a["email"] == "user_a@nexora.edu"
    assert profile_a["is_active"] is True

    # 2. PUT profile updates settings
    update_payload = {
        "full_name": "Student A Updated",
        "institution": "MIT Department of Physics",
        "education_level": "undergrad",
        "interests": ["Space Exploration & Astronomy", "Gaming & Game Dev"],
        "enable_code_mixing": True
    }
    put_res = client.put(
        "/api/v1/profile",
        json=update_payload,
        headers={"Authorization": f"Bearer {token_a}"}
    )
    assert put_res.status_code == 200
    updated_a = put_res.json()
    assert updated_a["full_name"] == "Student A Updated"
    assert updated_a["institution"] == "MIT Department of Physics"
    assert "Space Exploration & Astronomy" in updated_a["interests"]

    # 3. Verify user isolation: User B cannot access User A's data
    user_b_id = "bbbb0000-1111-2222-3333-444455556666"
    token_b = SecurityContext.create_test_jwt(user_id=user_b_id, email="user_b@nexora.edu")

    get_b_res = client.get("/api/v1/profile", headers={"Authorization": f"Bearer {token_b}"})
    assert get_b_res.status_code == 200
    profile_b = get_b_res.json()
    assert profile_b["id"] == user_b_id
    assert profile_b["id"] != user_a_id
    assert profile_b["email"] == "user_b@nexora.edu"
    assert profile_b["full_name"] != "Student A Updated"


def test_same_account_multi_provider_verification(client, db_session):
    """
    Verifies that authenticating with Google OAuth and subsequently with Email/Password
    on the exact same Supabase account resolves to the same user UUID, loads the exact same
    NEXORA profile, and produces zero duplicate profile rows.
    """
    user_uuid = "99999999-8888-7777-6666-555555555555"
    user_email = "alex.rivera@gmail.com"

    # Step 1: Student creates NEXORA account first (via email / signup)
    token_email = SecurityContext.create_test_jwt(
        user_id=user_uuid,
        email=user_email,
        role="student",
        provider="email",
        identities=["email"],
    )

    # 1a. /auth/me returns Email provider
    res_me_email = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token_email}"})
    assert res_me_email.status_code == 200
    assert res_me_email.json()["id"] == user_uuid
    assert res_me_email.json()["provider"] == "email"

    # 1b. GET profile provisions/retrieves for user_uuid
    res_prof_email = client.get("/api/v1/profile", headers={"Authorization": f"Bearer {token_email}"})
    assert res_prof_email.status_code == 200
    profile_data = res_prof_email.json()
    assert profile_data["id"] == user_uuid
    assert profile_data["email"] == user_email

    # 1c. Student customizes profile
    put_res = client.put(
        "/api/v1/profile",
        json={
            "full_name": "Alex Rivera (Quantum Learner)",
            "institution": "Stanford University",
            "education_level": "undergraduate",
            "interests": ["Quantum Mechanics", "Wave Optics"],
            "enable_code_mixing": True,
        },
        headers={"Authorization": f"Bearer {token_email}"},
    )
    assert put_res.status_code == 200

    # Step 2: Now that NEXORA account exists, student logs in using Google OAuth
    token_google = SecurityContext.create_test_jwt(
        user_id=user_uuid,
        email=user_email,
        role="student",
        provider="google",
        identities=["email", "google"],
    )

    # 2a. /auth/me confirms same user UUID with linked identities
    res_me_goog = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token_google}"})
    assert res_me_goog.status_code == 200
    assert res_me_goog.json()["id"] == user_uuid
    assert "google" in res_me_goog.json()["identities"]
    assert "email" in res_me_goog.json()["identities"]

    # 2b. Profile retrieved via Email login matches EXACT same profile customized via Google
    res_prof_email = client.get("/api/v1/profile", headers={"Authorization": f"Bearer {token_email}"})
    assert res_prof_email.status_code == 200
    email_profile = res_prof_email.json()
    assert email_profile["id"] == user_uuid
    assert email_profile["full_name"] == "Alex Rivera (Quantum Learner)"
    assert email_profile["institution"] == "Stanford University"
    assert email_profile["interests"] == ["Quantum Mechanics", "Wave Optics"]

    # Step 3: Verify the database contains ONLY 1 profile row for this user UUID (No duplicates)
    from app.models.profile import UserProfile
    rows = db_session.query(UserProfile).filter(UserProfile.id == user_uuid).all()
    assert len(rows) == 1

