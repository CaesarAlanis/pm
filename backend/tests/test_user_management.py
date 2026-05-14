import os
import tempfile

from fastapi.testclient import TestClient

os.environ["TESTING"] = "true"

from main import app
from app.db import connection as conn_mod
from app.db import ensure_db
from app import session as sess

DB_PATH_BACKUP = None
_client = None
_admin_cookies = None
_db_path = None

CSRF_HEADER = {"X-Requested-With": "fetch"}


def setup_module():
    global DB_PATH_BACKUP, _client, _admin_cookies, _db_path
    DB_PATH_BACKUP = os.environ.get("DB_PATH")
    _db_path = tempfile.mktemp(suffix=".db")
    os.environ["DB_PATH"] = _db_path
    conn_mod.DB_PATH = _db_path
    ensure_db()

    _client = TestClient(app)
    sess.create_user("admin", "adminpass123")
    token = sess.create_session("admin")
    _admin_cookies = {"session_token": token}


def teardown_module():
    global DB_PATH_BACKUP
    if DB_PATH_BACKUP is not None:
        os.environ["DB_PATH"] = DB_PATH_BACKUP
    else:
        os.environ.pop("DB_PATH", None)
    try:
        os.unlink(_db_path)
    except OSError:
        pass


def test_list_users_authenticated():
    resp = _client.get("/api/auth/users", cookies=_admin_cookies)
    assert resp.status_code == 200
    data = resp.json()
    assert "users" in data
    assert "total" in data
    assert data["total"] >= 1
    assert any(u["username"] == "admin" for u in data["users"])


def test_list_users_unauthenticated():
    resp = _client.get("/api/auth/users")
    assert resp.status_code == 401


def test_list_users_pagination():
    resp = _client.get("/api/auth/users?limit=1&offset=0", cookies=_admin_cookies)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["users"]) <= 1
    assert data["total"] >= 1


def test_list_users_includes_board_count():
    resp = _client.get("/api/auth/users", cookies=_admin_cookies)
    data = resp.json()
    admin = next(u for u in data["users"] if u["username"] == "admin")
    assert "board_count" in admin
    assert "username" in admin
    assert "created_at" in admin


def test_list_users_with_multiple_users():
    sess.create_user("user2", "password123")
    resp = _client.get("/api/auth/users", cookies=_admin_cookies)
    data = resp.json()
    assert data["total"] >= 2
    usernames = [u["username"] for u in data["users"]]
    assert "admin" in usernames
    assert "user2" in usernames


def test_list_users_offset_beyond_count():
    resp = _client.get("/api/auth/users?offset=9999", cookies=_admin_cookies)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["users"]) == 0
    assert data["total"] >= 1


def test_user_stats_after_board_creation():
    _client.post(
        "/api/boards",
        json={"title": "Stats Board"},
        headers=CSRF_HEADER,
        cookies=_admin_cookies,
    )
    resp = _client.get("/api/auth/users", cookies=_admin_cookies)
    data = resp.json()
    admin = next(u for u in data["users"] if u["username"] == "admin")
    assert admin["board_count"] >= 1


def test_get_user_stats():
    from app.db.user import get_user_stats
    conn = conn_mod.get_connection()
    admin_row = conn.execute("SELECT id FROM users WHERE username = 'admin'").fetchone()
    conn.close()
    stats = get_user_stats(admin_row["id"])
    assert stats is not None
    assert stats["username"] == "admin"
    assert "board_count" in stats
    assert "member_board_count" in stats


def test_count_users():
    from app.db.user import count_users
    total = count_users()
    assert total >= 2  # admin + user2
