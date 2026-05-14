import os
import tempfile
from pathlib import Path
from fastapi.testclient import TestClient

from main import app
from app.db import connection
from app.db import ensure_db
from app import session as sess

DB_PATH_BACKUP = None

CSRF_HEADER = {"X-Requested-With": "fetch"}

_client = None
_user_cookies = None
_second_cookies = None


def setup_module():
    global DB_PATH_BACKUP, _client, _user_cookies, _second_cookies
    DB_PATH_BACKUP = os.environ.get("DB_PATH")
    tmp = tempfile.mktemp(suffix=".db")
    os.environ["DB_PATH"] = tmp
    connection.DB_PATH = tmp
    ensure_db()

    _client = TestClient(app)
    resp = _client.post("/api/auth/login", json={"username": "user", "password": "password"}, headers=CSRF_HEADER)
    _user_cookies = {"session_token": resp.cookies["session_token"]}

    sess.create_user("collab2", "password123")
    token = sess.create_session("collab2")
    _second_cookies = {"session_token": token}


def teardown_module():
    global DB_PATH_BACKUP
    if DB_PATH_BACKUP is None:
        os.environ.pop("DB_PATH", None)
    else:
        os.environ["DB_PATH"] = DB_PATH_BACKUP
    connection.DB_PATH = os.environ.get("DB_PATH", str(Path(__file__).parent.parent / "data" / "pm.db"))
    if os.environ.get("DB_PATH") and os.path.exists(os.environ.get("DB_PATH", "")):
        os.unlink(os.environ["DB_PATH"])


def _get_board_id():
    boards = _client.get("/api/boards", cookies=_user_cookies).json()["boards"]
    return boards[0]["id"]


def _get_first_card_id():
    board_id = _get_board_id()
    board = _client.get(f"/api/boards/{board_id}", cookies=_user_cookies).json()
    return board["columns"][0]["cards"][0]["id"]


# --- Card detail edge cases ---

def test_update_nonexistent_comment():
    response = _client.put(
        "/api/boards/comments/cmt-nonexistent",
        json={"content": "Updated"},
        cookies=_user_cookies,
        headers=CSRF_HEADER,
    )
    assert response.status_code == 404


def test_delete_nonexistent_comment():
    response = _client.delete(
        "/api/boards/comments/cmt-nonexistent",
        cookies=_user_cookies,
        headers=CSRF_HEADER,
    )
    assert response.status_code == 404


def test_delete_nonexistent_checklist():
    response = _client.delete(
        "/api/boards/checklists/chl-nonexistent",
        cookies=_user_cookies,
        headers=CSRF_HEADER,
    )
    assert response.status_code == 404


def test_toggle_nonexistent_checklist_item():
    response = _client.put(
        "/api/boards/checklist-items/chi-nonexistent/toggle",
        json={"checked": True},
        cookies=_user_cookies,
        headers=CSRF_HEADER,
    )
    assert response.status_code == 404


def test_delete_nonexistent_checklist_item():
    response = _client.delete(
        "/api/boards/checklist-items/chi-nonexistent",
        cookies=_user_cookies,
        headers=CSRF_HEADER,
    )
    assert response.status_code == 404


def test_assign_empty_username():
    card_id = _get_first_card_id()
    response = _client.post(
        f"/api/boards/cards/{card_id}/assignees",
        json={"username": "   "},
        cookies=_user_cookies,
        headers=CSRF_HEADER,
    )
    assert response.status_code in (400, 422)


def test_card_detail_unauthenticated():
    card_id = _get_first_card_id()
    fresh = TestClient(app)
    response = fresh.get(f"/api/boards/cards/{card_id}/comments")
    assert response.status_code == 401


# --- Collaboration edge cases ---

def test_add_member_invalid_role():
    board_id = _get_board_id()
    response = _client.post(
        f"/api/boards/{board_id}/members",
        json={"board_id": board_id, "username": "collab2", "role": "admin"},
        cookies=_user_cookies,
        headers=CSRF_HEADER,
    )
    assert response.status_code in (400, 422)


def test_add_member_empty_username():
    board_id = _get_board_id()
    response = _client.post(
        f"/api/boards/{board_id}/members",
        json={"board_id": board_id, "username": "   ", "role": "editor"},
        cookies=_user_cookies,
        headers=CSRF_HEADER,
    )
    assert response.status_code in (400, 422)


def test_collaboration_unauthenticated():
    board_id = _get_board_id()
    fresh = TestClient(app)
    response = fresh.get(f"/api/boards/{board_id}/members")
    assert response.status_code == 401


def test_activity_log_empty():
    # Create a new board with no activity
    resp = _client.post(
        "/api/boards",
        json={"title": "Empty Activity Board"},
        cookies=_user_cookies,
        headers=CSRF_HEADER,
    )
    board_id = resp.json()["id"]
    response = _client.get(f"/api/boards/{board_id}/activity", cookies=_user_cookies)
    assert response.status_code == 200
    assert response.json()["activity"] == []


# --- Notification edge cases ---

def test_mark_nonexistent_notification_read():
    response = _client.put(
        "/api/notifications/ntf-nonexistent/read",
        cookies=_user_cookies,
        headers=CSRF_HEADER,
    )
    assert response.status_code == 404


def test_notifications_unauthenticated():
    fresh = TestClient(app)
    response = fresh.get("/api/notifications")
    assert response.status_code == 401


# --- Board edge cases ---

def test_get_nonexistent_board():
    response = _client.get("/api/boards/board-nonexistent", cookies=_user_cookies)
    assert response.status_code == 404


def test_update_nonexistent_board():
    response = _client.put(
        "/api/boards/board-nonexistent",
        json={"title": "X"},
        cookies=_user_cookies,
        headers=CSRF_HEADER,
    )
    assert response.status_code == 404


def test_delete_nonexistent_board():
    response = _client.delete(
        "/api/boards/board-nonexistent",
        cookies=_user_cookies,
        headers=CSRF_HEADER,
    )
    assert response.status_code == 404


# --- Card priority validation ---

def test_create_card_invalid_priority():
    card_id = _get_first_card_id()
    board_id = _get_board_id()
    board = _client.get(f"/api/boards/{board_id}", cookies=_user_cookies).json()
    col_id = board["columns"][0]["id"]
    response = _client.post(
        "/api/boards/cards",
        json={"column_id": col_id, "id": "card-pri-test", "title": "Priority test", "priority": "urgent"},
        cookies=_user_cookies,
        headers=CSRF_HEADER,
    )
    assert response.status_code in (400, 422)


# --- User search edge cases ---

def test_user_search_short_query():
    response = _client.get("/api/auth/users/search?q=u", cookies=_user_cookies)
    assert response.status_code == 200
    assert response.json()["users"] == []


def test_user_search_finds_user():
    response = _client.get("/api/auth/users/search?q=collab", cookies=_user_cookies)
    assert response.status_code == 200
    usernames = response.json()["users"]
    assert "collab2" in usernames


def test_user_search_unauthenticated():
    fresh = TestClient(app)
    response = fresh.get("/api/auth/users/search?q=user")
    assert response.status_code == 401
