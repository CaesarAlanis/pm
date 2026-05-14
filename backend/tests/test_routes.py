from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_hello():
    response = client.get("/api/hello")
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "Hello from the PM app!"


def test_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_serve_index():
    response = client.get("/")
    assert response.status_code == 200
    assert "Kanban Studio" in response.text
