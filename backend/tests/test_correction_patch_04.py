import json
import pytest
from app.core.security import SecurityContext
from app.services.learning.personalization_service import PersonalizationService
from app.models.profile import UserProfile


# ==============================================================================
# 1. LEARNING PREFERENCES SPECIFICATIONS
# ==============================================================================

def test_new_user_gets_all_current_preferences_enabled(client):
    """Spec 1: Newly created NEXORA student account has all available learning preferences enabled by default."""
    user_id = "00000000-cafe-1111-2222-000000000001"
    token = SecurityContext.create_test_jwt(user_id=user_id, email="newbie@nexora.dev")
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/v1/profile/preferences", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "learning_preferences" in data
    # All 3 available preferences must be enabled initially
    assert set(data["learning_preferences"]) == {"visual", "practical", "step_by_step"}
    assert len(data["learning_preferences"]) == 3

    # Also verify through /profile endpoint
    prof_res = client.get("/api/v1/profile", headers=headers)
    assert prof_res.status_code == 200
    assert set(prof_res.json()["learning_preferences"]) == {"visual", "practical", "step_by_step"}


def test_user_can_disable_one_preference(client):
    """Spec 2: User can disable one preference (leaving 2 enabled)."""
    user_id = "00000000-cafe-1111-2222-000000000002"
    token = SecurityContext.create_test_jwt(user_id=user_id, email="disable_one@nexora.dev")
    headers = {"Authorization": f"Bearer {token}"}

    # Disable 'visual', keeping ['practical', 'step_by_step']
    res = client.patch(
        "/api/v1/profile/preferences",
        json={"learning_preferences": ["practical", "step_by_step"]},
        headers=headers
    )
    assert res.status_code == 200
    data = res.json()
    assert set(data["learning_preferences"]) == {"practical", "step_by_step"}
    assert "visual" not in data["learning_preferences"]


def test_user_can_disable_two_preferences(client):
    """Spec 3: User can disable two preferences when there are three (leaving exactly 1 enabled)."""
    user_id = "00000000-cafe-1111-2222-000000000003"
    token = SecurityContext.create_test_jwt(user_id=user_id, email="disable_two@nexora.dev")
    headers = {"Authorization": f"Bearer {token}"}

    # Leave only 'practical' enabled
    res = client.patch(
        "/api/v1/profile/preferences",
        json={"learning_preferences": ["practical"]},
        headers=headers
    )
    assert res.status_code == 200
    data = res.json()
    assert data["learning_preferences"] == ["practical"]


def test_backend_rejects_zero_enabled_preference_state(client):
    """Spec 4 & 5: Backend strictly rejects any attempt to disable all preferences (zero-enabled state)."""
    user_id = "00000000-cafe-1111-2222-000000000004"
    token = SecurityContext.create_test_jwt(user_id=user_id, email="reject_zero@nexora.dev")
    headers = {"Authorization": f"Bearer {token}"}

    # Attempt to set empty list via PATCH /preferences
    res_empty = client.patch(
        "/api/v1/profile/preferences",
        json={"learning_preferences": []},
        headers=headers
    )
    assert res_empty.status_code == 422
    assert "At least one learning preference must remain enabled" in res_empty.json()["detail"]

    # Attempt to set all-invalid preferences (normalizes to empty)
    res_invalid = client.patch(
        "/api/v1/profile/preferences",
        json={"learning_preferences": ["invalid_pref_a", "nonexistent_mode"]},
        headers=headers
    )
    assert res_invalid.status_code == 422

    # Attempt to set empty list via PUT /profile
    res_put_empty = client.put(
        "/api/v1/profile",
        json={"learning_preferences": []},
        headers=headers
    )
    assert res_put_empty.status_code == 422

    # Verify that stored preferences were NOT modified or corrupted
    check_res = client.get("/api/v1/profile/preferences", headers=headers)
    assert len(check_res.json()["learning_preferences"]) >= 1


def test_existing_explicit_preferences_preserved(client, db_session):
    """Spec 6: Existing explicit choices are preserved and not silently overwritten with defaults."""
    user_id = "00000000-cafe-1111-2222-000000000005"
    token = SecurityContext.create_test_jwt(user_id=user_id, email="existing_student@nexora.dev")
    headers = {"Authorization": f"Bearer {token}"}

    # Set explicit preference: ['step_by_step']
    patch_res = client.patch(
        "/api/v1/profile/preferences",
        json={"learning_preferences": ["step_by_step"]},
        headers=headers
    )
    assert patch_res.status_code == 200

    # Fetch again - should remain ['step_by_step'], not reverted to all 3
    get_res = client.get("/api/v1/profile/preferences", headers=headers)
    assert get_res.json()["learning_preferences"] == ["step_by_step"]


def test_user_a_cannot_modify_user_b_preferences(client):
    """Spec 7: Strict user isolation for learning preferences."""
    user_a = "00000000-aaaa-1111-0000-000000000001"
    token_a = SecurityContext.create_test_jwt(user_id=user_a, email="student_a@nexora.dev")
    headers_a = {"Authorization": f"Bearer {token_a}"}

    user_b = "00000000-bbbb-2222-0000-000000000002"
    token_b = SecurityContext.create_test_jwt(user_id=user_b, email="student_b@nexora.dev")
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Student A enables only ['visual']
    client.patch("/api/v1/profile/preferences", json={"learning_preferences": ["visual"]}, headers=headers_a)

    # Student B enables only ['practical', 'step_by_step']
    client.patch("/api/v1/profile/preferences", json={"learning_preferences": ["practical", "step_by_step"]}, headers=headers_b)

    # Verify A cannot see or be overwritten by B
    res_a = client.get("/api/v1/profile/preferences", headers=headers_a)
    assert res_a.json()["learning_preferences"] == ["visual"]

    res_b = client.get("/api/v1/profile/preferences", headers=headers_b)
    assert set(res_b.json()["learning_preferences"]) == {"practical", "step_by_step"}


# ==============================================================================
# 2. LANGUAGE PREFERENCE PERSISTENCE SPECIFICATIONS
# ==============================================================================

def test_default_language_is_en(client):
    """Language Spec 1: Default language for newly provisioned profile is English ('en')."""
    user_id = "00000000-lang-1111-0000-000000000001"
    token = SecurityContext.create_test_jwt(user_id=user_id, email="lang_default@nexora.dev")
    headers = {"Authorization": f"Bearer {token}"}

    res_prof = client.get("/api/v1/profile", headers=headers)
    assert res_prof.status_code == 200
    assert res_prof.json()["preferred_language"] == "en"

    res_pref = client.get("/api/v1/profile/preferences", headers=headers)
    assert res_pref.status_code == 200
    assert res_pref.json()["preferred_language"] == "en"


def test_language_change_and_persistence_across_refresh_and_relogin(client):
    """Language Specs 2, 3, 4, 5: User changes en -> ta, persists across refresh and re-login under same UUID."""
    user_id = "00000000-lang-1111-0000-000000000002"
    user_email = "tamil_learner@nexora.dev"
    token = SecurityContext.create_test_jwt(user_id=user_id, email=user_email)
    headers = {"Authorization": f"Bearer {token}"}

    # Step 2 & 3: Change English -> Tamil via /profile/preferences
    res_patch = client.patch(
        "/api/v1/profile/preferences",
        json={"preferred_language": "ta"},
        headers=headers
    )
    assert res_patch.status_code == 200
    assert res_patch.json()["preferred_language"] == "ta"

    # Step 4: Refresh (simulated GET /profile)
    res_ref = client.get("/api/v1/profile", headers=headers)
    assert res_ref.status_code == 200
    assert res_ref.json()["preferred_language"] == "ta"

    # Step 5: Logout / Re-login (new token with same UUID)
    new_token = SecurityContext.create_test_jwt(user_id=user_id, email=user_email)
    new_headers = {"Authorization": f"Bearer {new_token}"}
    res_relogin = client.get("/api/v1/profile", headers=new_headers)
    assert res_relogin.status_code == 200
    assert res_relogin.json()["preferred_language"] == "ta"


def test_google_and_email_auth_restore_same_language_and_preferences(client, db_session):
    """Language Specs 6 & 7: Google login and Email/password login share identical persisted language and preferences."""
    user_uuid = "00000000-lang-1111-0000-000000000003"
    user_email = "multi_provider_student@nexora.dev"

    token_email = SecurityContext.create_test_jwt(
        user_id=user_uuid,
        email=user_email,
        provider="email",
        identities=["email"]
    )
    token_google = SecurityContext.create_test_jwt(
        user_id=user_uuid,
        email=user_email,
        provider="google",
        identities=["email", "google"]
    )

    # 1. User sets up initial profile via email signup
    init_res = client.get("/api/v1/profile", headers={"Authorization": f"Bearer {token_email}"})
    assert init_res.status_code == 200

    # 2. User sets language to Telugu ('te') and learning preferences to ['visual', 'step_by_step'] via Google session
    put_res = client.put(
        "/api/v1/profile",
        json={
            "preferred_language": "te",
            "learning_preferences": ["visual", "step_by_step"],
        },
        headers={"Authorization": f"Bearer {token_google}"}
    )
    assert put_res.status_code == 200

    # 3. User later logs in via Email/password session
    email_res = client.get("/api/v1/profile", headers={"Authorization": f"Bearer {token_email}"})
    assert email_res.status_code == 200
    email_data = email_res.json()
    assert email_data["id"] == user_uuid
    assert email_data["preferred_language"] == "te"
    assert set(email_data["learning_preferences"]) == {"visual", "step_by_step"}

    # 3. Exactly one profile record in the database
    rows = db_session.query(UserProfile).filter(UserProfile.id == user_uuid).all()
    assert len(rows) == 1
    assert rows[0].preferred_language == "te"


def test_user_b_cannot_access_or_modify_user_a_language(client):
    """Language Spec 8: User isolation for language preference."""
    user_a = "00000000-lang-aaaa-0000-000000000001"
    token_a = SecurityContext.create_test_jwt(user_id=user_a, email="student_lang_a@nexora.dev")
    headers_a = {"Authorization": f"Bearer {token_a}"}

    user_b = "00000000-lang-bbbb-0000-000000000002"
    token_b = SecurityContext.create_test_jwt(user_id=user_b, email="student_lang_b@nexora.dev")
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Student A chooses Tamil ('ta')
    client.put("/api/v1/profile", json={"preferred_language": "ta"}, headers=headers_a)

    # Student B chooses Telugu ('te')
    client.put("/api/v1/profile", json={"preferred_language": "te"}, headers=headers_b)

    # Verify A remains 'ta' and B remains 'te'
    assert client.get("/api/v1/profile", headers=headers_a).json()["preferred_language"] == "ta"
    assert client.get("/api/v1/profile", headers=headers_b).json()["preferred_language"] == "te"


def test_preferences_reset_endpoint_restores_all_learning_preferences(client):
    """Verifies that POST /profile/preferences/reset restores ALL 3 learning preferences enabled while keeping language."""
    user_id = "00000000-cafe-1111-2222-000000000009"
    token = SecurityContext.create_test_jwt(user_id=user_id, email="reset_test@nexora.dev")
    headers = {"Authorization": f"Bearer {token}"}

    # Set custom state: 1 preference disabled and language = 'ta'
    client.patch(
        "/api/v1/profile/preferences",
        json={"learning_preferences": ["practical"], "preferred_language": "ta"},
        headers=headers
    )

    # Call reset
    reset_res = client.post("/api/v1/profile/preferences/reset", headers=headers)
    assert reset_res.status_code == 200
    reset_data = reset_res.json()
    # All 3 learning preferences must be restored as enabled
    assert set(reset_data["learning_preferences"]) == {"visual", "practical", "step_by_step"}
    # Language preference must remain intact
    assert reset_data["preferred_language"] == "ta"
