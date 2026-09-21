def test_list_subjects(client):
    """Verifies that GET /api/v1/learning/subjects returns empty [] without an active syllabus (Syllabus-First)."""
    response = client.get("/api/v1/learning/subjects")
    assert response.status_code == 200
    subjects = response.json()
    assert subjects == []


def test_explore_concept_endpoint(client):
    """Verifies that POST /api/v1/learning/explore decomposes a concept into an experiential blueprint."""
    payload = {"query": "Doppler Effect", "subject_hint": "physics"}
    response = client.post("/api/v1/learning/explore", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["concept"] == "Doppler Effect"
    assert "wave_compression" in str(data["simulation"])
    assert "why_it_matters" in data
    assert "simple_explanation" in data
    assert "quick_check_question" in data
    assert len(data["quick_check_options"]) == 4


def test_validation_error_handling(client):
    """Verifies that malformed requests return structured error responses without leaking internals."""
    response = client.post("/api/v1/learning/explore", json={"query": ""})  # violates min_length=2
    assert response.status_code == 422
    data = response.json()
    assert data["success"] is False
    assert data["error_code"] == "VALIDATION_ERROR"
