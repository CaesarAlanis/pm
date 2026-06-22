from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_login_accepts_dummy_credentials() -> None:
    response = client.post(
        "/api/auth/login", json={"username": "user", "password": "password"}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert isinstance(body["access_token"], str)
    assert len(body["access_token"]) > 10


def test_login_rejects_invalid_credentials() -> None:
    response = client.post(
        "/api/auth/login", json={"username": "user", "password": "wrong"}
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid credentials"