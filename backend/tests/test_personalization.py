import pytest
from app.core.security import SecurityContext
from app.services.learning.personalization_service import PersonalizationService


def test_new_student_no_interests_defaults(client):
    """Test A: New student with no interests receives standard curriculum baseline without error."""
    user_id = "00000000-aaaa-bbbb-cccc-000000000001"
    token = SecurityContext.create_test_jwt(user_id=user_id, email="new_student@nexora.dev")

    res = client.get("/api/v1/profile/preferences", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert data["interests"] == []
    assert data["custom_interests"] == []
    assert data["preferred_learning_style"] == "visual"

    # Explore endpoint defaults cleanly to curriculum standard
    explore_res = client.post(
        "/api/v1/learning/explore",
        json={"query": "Doppler Effect"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert explore_res.status_code == 200
    explore_data = explore_res.json()
    assert explore_data["concept"] == "Doppler Effect"
    assert explore_data["personalized_context"] is not None
    assert explore_data["personalized_context"]["interest"] == "Curriculum Standard"
    assert "f' = f" in explore_data["technical_explanation"]


def test_student_select_one_interest(client):
    """Test B: Student selecting one interest (Gaming) receives tailored context."""
    user_id = "00000000-aaaa-bbbb-cccc-000000000002"
    token = SecurityContext.create_test_jwt(user_id=user_id, email="gamer@nexora.dev")

    patch_res = client.patch(
        "/api/v1/profile/preferences",
        json={"interests": ["Gaming"]},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["interests"] == ["Gaming"]

    # Explore returns Gaming perspective
    explore_res = client.post(
        "/api/v1/learning/explore",
        json={"query": "Binary Search"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert explore_res.status_code == 200
    data = explore_res.json()
    assert data["personalized_context"]["interest"] == "Gaming"
    assert "Spatial Partitioning" in data["personalized_context"]["headline"]
    # Verify core technical explanation is untouched
    assert "O(log n)" in data["technical_explanation"]


def test_student_select_multiple_interests(client):
    """Test C: Student selecting multiple interests (Gaming, Cars, Space)."""
    user_id = "00000000-aaaa-bbbb-cccc-000000000003"
    token = SecurityContext.create_test_jwt(user_id=user_id, email="multi@nexora.dev")

    patch_res = client.patch(
        "/api/v1/profile/preferences",
        json={"interests": ["Gaming", "Cars", "Space"]},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["interests"] == ["Gaming", "Cars", "Space"]


def test_student_editing_and_removing_interests(client):
    """Test D & E: Student edits interests and then removes them."""
    user_id = "00000000-aaaa-bbbb-cccc-000000000004"
    token = SecurityContext.create_test_jwt(user_id=user_id, email="editor@nexora.dev")

    # Set initial
    client.patch("/api/v1/profile/preferences", json={"interests": ["Cricket"]}, headers={"Authorization": f"Bearer {token}"})

    # Edit to Music & Coding
    res_edit = client.patch("/api/v1/profile/preferences", json={"interests": ["Music", "Coding"]}, headers={"Authorization": f"Bearer {token}"})
    assert res_edit.status_code == 200
    assert res_edit.json()["interests"] == ["Music", "Coding"]

    # Remove all interests (empty array)
    res_empty = client.patch("/api/v1/profile/preferences", json={"interests": []}, headers={"Authorization": f"Bearer {token}"})
    assert res_empty.status_code == 200
    assert res_empty.json()["interests"] == []


def test_student_reset_preferences(client):
    """Test F: Resetting preferences via dedicated endpoint."""
    user_id = "00000000-aaaa-bbbb-cccc-000000000005"
    token = SecurityContext.create_test_jwt(user_id=user_id, email="reset@nexora.dev")

    # Set some preferences first
    client.patch(
        "/api/v1/profile/preferences",
        json={"interests": ["Cars"], "custom_interests": ["Drone Racing"], "preferred_learning_style": "practical"},
        headers={"Authorization": f"Bearer {token}"},
    )

    # Reset
    reset_res = client.post("/api/v1/profile/preferences/reset", headers={"Authorization": f"Bearer {token}"})
    assert reset_res.status_code == 200
    data = reset_res.json()
    assert data["interests"] == []
    assert data["custom_interests"] == []
    assert data["preferred_learning_style"] == "visual"


def test_duplicate_and_casing_normalization(client):
    """Test G: Duplicate interests and varied casing normalized cleanly."""
    raw_list = ["gaming", "Gaming", "GAMING", "cars", "Cars", "cricket"]
    clean_canon, clean_cust = PersonalizationService.validate_and_clean_interests(raw_list)

    # Should have no duplicates
    lower_canon = [c.lower() for c in clean_canon]
    assert len(lower_canon) == len(set(lower_canon))
    assert len(clean_canon) == 3


def test_custom_interest_sanitization(client):
    """Test H: Custom write-in interests are safely sanitized and preserved."""
    user_id = "00000000-aaaa-bbbb-cccc-000000000006"
    token = SecurityContext.create_test_jwt(user_id=user_id, email="custom@nexora.dev")

    patch_res = client.patch(
        "/api/v1/profile/preferences",
        json={
            "interests": ["Gaming"],
            "custom_interests": ["<script>alert(1)</script>Photography", "Chess / Tactics"],
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert patch_res.status_code == 200
    custom_saved = patch_res.json()["custom_interests"]
    assert "<script>" not in custom_saved[0]
    assert "Photography" in custom_saved[0]


def test_unauthorized_preferences_access(client):
    """Test I: Unauthenticated requests to /preferences return 401."""
    get_res = client.get("/api/v1/profile/preferences")
    assert get_res.status_code == 401

    patch_res = client.patch("/api/v1/profile/preferences", json={"interests": ["Gaming"]})
    assert patch_res.status_code == 401

    reset_res = client.post("/api/v1/profile/preferences/reset")
    assert reset_res.status_code == 401


def test_cross_student_user_isolation(client):
    """Test J & K: Strict user isolation (User B cannot see or alter User A's preferences)."""
    user_a_id = "aaaa1111-2222-3333-4444-555566667777"
    token_a = SecurityContext.create_test_jwt(user_id=user_a_id, email="student_a@nexora.dev")

    user_b_id = "bbbb1111-2222-3333-4444-555566667777"
    token_b = SecurityContext.create_test_jwt(user_id=user_b_id, email="student_b@nexora.dev")

    # User A sets Gaming
    client.patch("/api/v1/profile/preferences", json={"interests": ["Gaming"]}, headers={"Authorization": f"Bearer {token_a}"})

    # User B sets Cricket
    client.patch("/api/v1/profile/preferences", json={"interests": ["Cricket"]}, headers={"Authorization": f"Bearer {token_b}"})

    # User A reads preferences
    res_a = client.get("/api/v1/profile/preferences", headers={"Authorization": f"Bearer {token_a}"})
    assert res_a.json()["interests"] == ["Gaming"]

    # User B reads preferences
    res_b = client.get("/api/v1/profile/preferences", headers={"Authorization": f"Bearer {token_b}"})
    assert res_b.json()["interests"] == ["Cricket"]


def test_personalization_mapping_domains():
    """Test L: Personalization service produces verified analogies across all 6 primary prompt domains."""
    # 1. Gaming
    ctx_gaming = PersonalizationService.get_personalization_for_concept("Binary Search", ["Gaming"])
    assert "Game World Spatial Partitioning" in ctx_gaming.headline

    # 2. Cricket
    ctx_cricket = PersonalizationService.get_personalization_for_concept("Doppler Effect", ["Cricket"])
    assert "UltraEdge" in ctx_cricket.headline

    # 3. Cars
    ctx_cars = PersonalizationService.get_personalization_for_concept("Doppler Effect", ["Cars"])
    assert "Formula 1" in ctx_cars.headline

    # 4. Music
    ctx_music = PersonalizationService.get_personalization_for_concept("Doppler Effect", ["Music"])
    assert "Leslie Rotary Speakers" in ctx_music.headline

    # 5. Space
    ctx_space = PersonalizationService.get_personalization_for_concept("Doppler Effect", ["Space"])
    assert "Cosmic Redshift" in ctx_space.headline

    # 6. Coding
    ctx_coding = PersonalizationService.get_personalization_for_concept("Binary Search", ["Coding"])
    assert "Git Bisect" in ctx_coding.headline


def test_dashboard_recommendations_behavior(client):
    """Test M: Dashboard recommendations return [] when no active syllabus exists (Syllabus-First)."""
    # 1. Unauthenticated guest returns empty list without 401
    guest_res = client.get("/api/v1/learning/recommendations")
    assert guest_res.status_code == 200
    guest_recs = guest_res.json()
    assert guest_recs == []

    # 2. Authenticated user without active syllabus also returns []
    user_id = "cccc1111-2222-3333-4444-555566667777"
    token = SecurityContext.create_test_jwt(user_id=user_id, email="cars_fan@nexora.dev")
    client.patch("/api/v1/profile/preferences", json={"interests": ["Cars"]}, headers={"Authorization": f"Bearer {token}"})

    auth_res = client.get("/api/v1/learning/recommendations", headers={"Authorization": f"Bearer {token}"})
    assert auth_res.status_code == 200
    auth_recs = auth_res.json()
    assert auth_recs == []


def test_perspectives_toggle_endpoint(client):
    """Verifies that /perspectives/{slug} returns multiple real-world hobby viewpoints for UI toggle."""
    res = client.get("/api/v1/learning/perspectives/doppler-effect")
    assert res.status_code == 200
    perspectives = res.json()
    assert len(perspectives) >= 4
    interests = [p["interest"] for p in perspectives]
    assert "Cars" in interests
    assert "Space" in interests
    assert "Music" in interests


def test_academic_formulas_invariance(client):
    """Test P: Personalization must NEVER modify formulas, definitions, or core correct answers."""
    for interest in ["Gaming", "Cricket", "Cars", "Music", "Space", "Coding"]:
        res = client.post(
            "/api/v1/learning/explore",
            json={"query": "Doppler Effect", "interest_hint": interest},
        )
        assert res.status_code == 200
        data = res.json()
        # Mathematical formula must remain invariant across all perspectives
        assert "f' = f" in data["technical_explanation"]
        assert data["quick_check_answer_index"] == 0
