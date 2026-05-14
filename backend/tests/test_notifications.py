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
_test_user_cookies = {}


def setup_module():
    global DB_PATH_BACKUP, _client, _user_cookies
    DB_PATH_BACKUP = os.environ.get("DB_PATH")
    tmp = tempfile.mktemp(suffix=".db")
    os.environ["DB_PATH"] = tmp
    connection.DB_PATH = tmp
    ensure_db()

    _client = TestClient(app)
    # Login once as 'user' and reuse
    resp = _client.post("/api/auth/login", json={"username": "user", "password": "password"}, headers=CSRF_HEADER)
    _user_cookies = {"session_token": resp.cookies["session_token"]}

    # Create test users directly in DB and create sessions to avoid rate limiting
    usernames = ["empty1", "assign1", "read1", "unread1", "markall1"]
    for u in usernames:
        sess.create_user(u, "password123")
        token = sess.create_session(u)
        _test_user_cookies[u] = {"session_token": token}


def teardown_module():
    global DB_PATH_BACKUP
    if DB_PATH_BACKUP is None:
        os.environ.pop("DB_PATH", None)
    else:
        os.environ["DB_PATH"] = DB_PATH_BACKUP
    connection.DB_PATH = os.environ.get("DB_PATH", str(Path(__file__).parent.parent / "data" / "pm.db"))
    if os.environ.get("DB_PATH") and os.path.exists(os.environ.get("DB_PATH", "")):
        os.unlink(os.environ["DB_PATH"])


def _get_first_card_id():
    boards = _client.get("/api/boards", cookies=_user_cookies).json()["boards"]
    board_id = boards[0]["id"]
    board = _client.get(f"/api/boards/{board_id}", cookies=_user_cookies).json()
    return board["columns"][0]["cards"][0]["id"], board_id


def _setup_assignee_notification(username):
    """Add assignee as board member and assign to a card."""
    assignee_cookies = _test_user_cookies[username]
    card_id, board_id = _get_first_card_id()

    _client.post(
        f"/api/boards/{board_id}/members",
        json={"board_id": board_id, "username": username, "role": "editor"},
        cookies=_user_cookies,
        headers=CSRF_HEADER,
    )
    _client.post(
        f"/api/boards/cards/{card_id}/assignees",
        json={"username": username},
        cookies=_user_cookies,
        headers=CSRF_HEADER,
    )
    return assignee_cookies


def test_get_notifications_empty():
    cookies = _test_user_cookies["empty1"]
    response = _client.get("/api/notifications", cookies=cookies)
    assert response.status_code == 200
    data = response.json()
    assert data["notifications"] == []


def test_notification_created_on_assignment():
    assignee_cookies = _setup_assignee_notification("assign1")

    response = _client.get("/api/notifications", cookies=assignee_cookies)
    assert response.status_code == 200
    data = response.json()
    assert len(data["notifications"]) >= 1
    notif = data["notifications"][0]
    assert notif["action"] == "assigned"


def test_mark_notification_read():
    assignee_cookies = _setup_assignee_notification("read1")

    response = _client.get("/api/notifications", cookies=assignee_cookies)
    assert len(response.json()["notifications"]) >= 1
    notif_id = response.json()["notifications"][0]["id"]

    mark_resp = _client.put(
        f"/api/notifications/{notif_id}/read",
        cookies=assignee_cookies,
        headers=CSRF_HEADER,
    )
    assert mark_resp.status_code == 200


def test_get_unread_only():
    assignee_cookies = _setup_assignee_notification("unread1")

    _client.put("/api/notifications/read-all", cookies=assignee_cookies, headers=CSRF_HEADER)

    unread_resp = _client.get("/api/notifications?unread=true", cookies=assignee_cookies)
    assert len(unread_resp.json()["notifications"]) == 0


def test_mark_all_notifications_read():
    assignee_cookies = _setup_assignee_notification("markall1")

    response = _client.put(
        "/api/notifications/read-all",
        cookies=assignee_cookies,
        headers=CSRF_HEADER,
    )
    assert response.status_code == 200

    unread_resp = _client.get("/api/notifications?unread=true", cookies=assignee_cookies)
    assert len(unread_resp.json()["notifications"]) == 0


def test_notifications_unauthenticated():
    fresh = TestClient(app)
    assert fresh.get("/api/notifications").status_code == 401
