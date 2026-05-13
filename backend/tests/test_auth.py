from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_login_success():
    response = client.post("/api/auth/login", json={"username": "user", "password": "password"})
    assert response.status_code == 200
    assert response.json()["username"] == "user"
    assert "session_token" in response.cookies


def test_login_wrong_password():
    response = client.post("/api/auth/login", json={"username": "user", "password": "wrong"})
    assert response.status_code == 401


def test_login_wrong_username():
    response = client.post("/api/auth/login", json={"username": "admin", "password": "password"})
    assert response.status_code == 401


def test_me_authenticated():
    login_resp = client.post("/api/auth/login", json={"username": "user", "password": "password"})
    token = login_resp.cookies["session_token"]
    response = client.get("/api/auth/me", cookies={"session_token": token})
    assert response.status_code == 200
    assert response.json()["username"] == "user"


def test_me_unauthenticated():
    fresh_client = TestClient(app)
    response = fresh_client.get("/api/auth/me")
    assert response.status_code == 401


def test_me_invalid_token():
    response = client.get("/api/auth/me", cookies={"session_token": "invalid"})
    assert response.status_code == 401


def test_logout():
    login_resp = client.post("/api/auth/login", json={"username": "user", "password": "password"})
    token = login_resp.cookies["session_token"]
    response = client.post("/api/auth/logout", cookies={"session_token": token})
    assert response.status_code == 200

    me_resp = client.get("/api/auth/me", cookies={"session_token": token})
    assert me_resp.status_code == 401


def test_logout_without_session():
    response = client.post("/api/auth/logout")
    assert response.status_code == 200
