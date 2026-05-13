from fastapi.testclient import TestClient

from main import app

CSRF_HEADER = {"X-Requested-With": "fetch"}


def setup_function():
    # Clear rate limiter state between tests
    if hasattr(app.state, "limiter") and hasattr(app.state.limiter, "_storage"):
        app.state.limiter._storage.reset()


def test_login_success():
    client = TestClient(app)
    response = client.post("/api/auth/login", json={"username": "user", "password": "password"}, headers=CSRF_HEADER)
    assert response.status_code == 200
    assert response.json()["username"] == "user"
    assert "session_token" in response.cookies


def test_login_wrong_password():
    client = TestClient(app)
    response = client.post("/api/auth/login", json={"username": "user", "password": "wrong"}, headers=CSRF_HEADER)
    assert response.status_code == 401


def test_login_wrong_username():
    client = TestClient(app)
    response = client.post("/api/auth/login", json={"username": "admin", "password": "password"}, headers=CSRF_HEADER)
    assert response.status_code == 401


def test_me_authenticated():
    client = TestClient(app)
    login_resp = client.post("/api/auth/login", json={"username": "user", "password": "password"}, headers=CSRF_HEADER)
    token = login_resp.cookies["session_token"]
    response = client.get("/api/auth/me", cookies={"session_token": token})
    assert response.status_code == 200
    assert response.json()["username"] == "user"


def test_me_unauthenticated():
    client = TestClient(app)
    response = client.get("/api/auth/me")
    assert response.status_code == 401


def test_me_invalid_token():
    client = TestClient(app)
    response = client.get("/api/auth/me", cookies={"session_token": "invalid"})
    assert response.status_code == 401


def test_logout():
    client = TestClient(app)
    login_resp = client.post("/api/auth/login", json={"username": "user", "password": "password"}, headers=CSRF_HEADER)
    token = login_resp.cookies["session_token"]
    response = client.post("/api/auth/logout", cookies={"session_token": token}, headers=CSRF_HEADER)
    assert response.status_code == 200

    me_resp = client.get("/api/auth/me", cookies={"session_token": token})
    assert me_resp.status_code == 401


def test_logout_without_session():
    client = TestClient(app)
    response = client.post("/api/auth/logout", headers=CSRF_HEADER)
    assert response.status_code == 200


def test_csrf_rejects_mutating_request_without_header():
    client = TestClient(app)
    response = client.post("/api/auth/login", json={"username": "user", "password": "password"})
    assert response.status_code == 403
