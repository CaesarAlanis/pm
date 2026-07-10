from fastapi.testclient import TestClient

from backend.main import app


client = TestClient(app)


def test_root_serves_frontend_index() -> None:
    response = client.get("/")

    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]
    assert "Kanban Studio" in response.text
