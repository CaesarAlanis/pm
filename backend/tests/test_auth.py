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


def test_register_success():
    client = TestClient(app)
    response = client.post(
        "/api/auth/register",
        json={"username": "newuser", "password": "newpass123"},
        headers=CSRF_HEADER,
    )
    assert response.status_code == 200
    assert response.json()["username"] == "newuser"
    assert "session_token" in response.cookies


def test_register_duplicate_username():
    client = TestClient(app)
    response = client.post(
        "/api/auth/register",
        json={"username": "user", "password": "password123"},
        headers=CSRF_HEADER,
    )
    assert response.status_code == 409


def test_register_short_username():
    client = TestClient(app)
    response = client.post(
        "/api/auth/register",
        json={"username": "ab", "password": "password123"},
        headers=CSRF_HEADER,
    )
    assert response.status_code == 422


def test_register_short_password():
    client = TestClient(app)
    response = client.post(
        "/api/auth/register",
        json={"username": "validuser", "password": "12345"},
        headers=CSRF_HEADER,
    )
    assert response.status_code == 422


def test_register_invalid_username():
    client = TestClient(app)
    response = client.post(
        "/api/auth/register",
        json={"username": "invalid user!", "password": "password123"},
        headers=CSRF_HEADER,
    )
    assert response.status_code == 422


def test_register_then_login():
    client = TestClient(app)
    reg_resp = client.post(
        "/api/auth/register",
        json={"username": "logintest", "password": "testpass123"},
        headers=CSRF_HEADER,
    )
    assert reg_resp.status_code == 200
    login_resp = client.post(
        "/api/auth/login",
        json={"username": "logintest", "password": "testpass123"},
        headers=CSRF_HEADER,
    )
    assert login_resp.status_code == 200
    assert login_resp.json()["username"] == "logintest"


def test_change_password():
    client = TestClient(app)
    client.post(
        "/api/auth/register",
        json={"username": "pwchange", "password": "oldpass123"},
        headers=CSRF_HEADER,
    )
    login_resp = client.post(
        "/api/auth/login",
        json={"username": "pwchange", "password": "oldpass123"},
        headers=CSRF_HEADER,
    )
    token = login_resp.cookies["session_token"]
    response = client.put(
        "/api/auth/password",
        json={"current_password": "oldpass123", "new_password": "newpass456"},
        cookies={"session_token": token},
        headers=CSRF_HEADER,
    )
    assert response.status_code == 200
    # Login with new password
    login2 = client.post(
        "/api/auth/login",
        json={"username": "pwchange", "password": "newpass456"},
        headers=CSRF_HEADER,
    )
    assert login2.status_code == 200


def test_change_password_wrong_current():
    client = TestClient(app)
    login_resp = client.post(
        "/api/auth/login",
        json={"username": "user", "password": "password"},
        headers=CSRF_HEADER,
    )
    token = login_resp.cookies["session_token"]
    response = client.put(
        "/api/auth/password",
        json={"current_password": "wrongpass", "new_password": "newpass456"},
        cookies={"session_token": token},
        headers=CSRF_HEADER,
    )
    assert response.status_code == 400
