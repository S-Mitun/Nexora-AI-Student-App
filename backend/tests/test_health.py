def test_root_health(client):
    """Verifies that GET /health returns 200 and healthy status."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["project"] == "NEXORA"
    assert "timestamp" in data
    assert data["system"]["api"] == "healthy"


def test_api_v1_health(client):
    """Verifies that GET /api/v1/health returns 200 and versioned status."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "capabilities" in data
    assert data["capabilities"]["learning_engine"] is True


def test_root_discovery(client):
    """Verifies root discovery route."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["project"] == "NEXORA"
    assert data["health"] == "/health"
