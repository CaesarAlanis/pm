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
    # Login as main user
    resp = _client.post("/api/auth/login", json={"username": "user", "password": "password"}, headers=CSRF_HEADER)
    _user_cookies = {"session_token": resp.cookies["session_token"]}

    # Create second user directly in DB to avoid rate limiting
    sess.create_user("collab", "password123")
    token = sess.create_session("collab")
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


# --- Board Member Management ---

def test_add_board_member():
    board_id = _get_board_id()
    response = _client.post(
        f"/api/boards/{board_id}/members",
        json={"board_id": board_id, "username": "collab", "role": "editor"},
        cookies=_user_cookies,
        headers=CSRF_HEADER,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "collab"
    assert data["role"] == "editor"


def test_list_board_members():
    board_id = _get_board_id()
    response = _client.get(f"/api/boards/{board_id}/members", cookies=_user_cookies)
    assert response.status_code == 200
    data = response.json()
    usernames = [m["username"] for m in data["members"]]
    assert "user" in usernames
    assert "collab" in usernames


def test_cannot_add_nonexistent_member():
    board_id = _get_board_id()
    response = _client.post(
        f"/api/boards/{board_id}/members",
        json={"board_id": board_id, "username": "nonexistent", "role": "editor"},
        cookies=_user_cookies,
        headers=CSRF_HEADER,
    )
    assert response.status_code == 400


def test_cannot_add_duplicate_member():
    board_id = _get_board_id()
    response = _client.post(
        f"/api/boards/{board_id}/members",
        json={"board_id": board_id, "username": "collab", "role": "viewer"},
        cookies=_user_cookies,
        headers=CSRF_HEADER,
    )
    assert response.status_code == 400


def test_remove_board_member():
    board_id = _get_board_id()
    response = _client.delete(
        f"/api/boards/{board_id}/members/collab",
        cookies=_user_cookies,
        headers=CSRF_HEADER,
    )
    assert response.status_code == 200

    # Re-add for subsequent tests
    _client.post(
        f"/api/boards/{board_id}/members",
        json={"board_id": board_id, "username": "collab", "role": "editor"},
        cookies=_user_cookies,
        headers=CSRF_HEADER,
    )


# --- Activity Log ---

def test_activity_log():
    board_id = _get_board_id()
    response = _client.get(f"/api/boards/{board_id}/activity", cookies=_user_cookies)
    assert response.status_code == 200
    data = response.json()
    assert "activity" in data
    assert isinstance(data["activity"], list)


# --- Cross-Feature: Assign creates notification ---

def test_assign_creates_notification_for_assignee():
    card_id = _get_first_card_id()

    # Assign collab to a card
    response = _client.post(
        f"/api/boards/cards/{card_id}/assignees",
        json={"username": "collab"},
        cookies=_user_cookies,
        headers=CSRF_HEADER,
    )
    assert response.status_code == 200

    # Check collab has a notification
    notif_resp = _client.get("/api/notifications", cookies=_second_cookies)
    assert notif_resp.status_code == 200
    notifications = notif_resp.json()["notifications"]
    assert len(notifications) >= 1
    assert any(n["action"] == "assigned" for n in notifications)


# --- Card comments integration ---

def test_comment_lifecycle():
    card_id = _get_first_card_id()

    # Add comment
    create_resp = _client.post(
        f"/api/boards/cards/{card_id}/comments",
        json={"content": "First comment"},
        cookies=_user_cookies,
        headers=CSRF_HEADER,
    )
    assert create_resp.status_code == 200
    comment_id = create_resp.json()["id"]

    # List comments
    list_resp = _client.get(f"/api/boards/cards/{card_id}/comments", cookies=_user_cookies)
    assert list_resp.status_code == 200
    comments = list_resp.json()["comments"]
    assert len(comments) >= 1
    assert any(c["content"] == "First comment" for c in comments)

    # Update comment
    update_resp = _client.put(
        f"/api/boards/comments/{comment_id}",
        json={"content": "Updated comment"},
        cookies=_user_cookies,
        headers=CSRF_HEADER,
    )
    assert update_resp.status_code == 200

    # Delete comment
    delete_resp = _client.delete(
        f"/api/boards/comments/{comment_id}",
        cookies=_user_cookies,
        headers=CSRF_HEADER,
    )
    assert delete_resp.status_code == 200


# --- Checklist integration ---

def test_checklist_lifecycle():
    card_id = _get_first_card_id()

    # Create checklist
    cl_resp = _client.post(
        f"/api/boards/cards/{card_id}/checklists",
        json={"title": "Setup Tasks"},
        cookies=_user_cookies,
        headers=CSRF_HEADER,
    )
    assert cl_resp.status_code == 200
    checklist_id = cl_resp.json()["id"]

    # Add items
    item1_resp = _client.post(
        f"/api/boards/checklists/{checklist_id}/items",
        json={"content": "Install dependencies"},
        cookies=_user_cookies,
        headers=CSRF_HEADER,
    )
    assert item1_resp.status_code == 200
    item1_id = item1_resp.json()["id"]

    item2_resp = _client.post(
        f"/api/boards/checklists/{checklist_id}/items",
        json={"content": "Configure env"},
        cookies=_user_cookies,
        headers=CSRF_HEADER,
    )
    assert item2_resp.status_code == 200

    # Toggle item
    toggle_resp = _client.put(
        f"/api/boards/checklist-items/{item1_id}/toggle",
        json={"checked": True},
        cookies=_user_cookies,
        headers=CSRF_HEADER,
    )
    assert toggle_resp.status_code == 200

    # Verify checklist state
    list_resp = _client.get(f"/api/boards/cards/{card_id}/checklists", cookies=_user_cookies)
    checklists = list_resp.json()["checklists"]
    target_cl = next(cl for cl in checklists if cl["id"] == checklist_id)
    assert len(target_cl["items"]) == 2
    checked_items = [i for i in target_cl["items"] if i["checked"]]
    assert len(checked_items) == 1

    # Delete item
    del_resp = _client.delete(
        f"/api/boards/checklist-items/{item1_id}",
        cookies=_user_cookies,
        headers=CSRF_HEADER,
    )
    assert del_resp.status_code == 200

    # Delete checklist
    del_cl_resp = _client.delete(
        f"/api/boards/checklists/{checklist_id}",
        cookies=_user_cookies,
        headers=CSRF_HEADER,
    )
    assert del_cl_resp.status_code == 200


# --- Board from template ---

def test_create_board_from_template():
    # Create board from Scrum template
    resp = _client.post(
        "/api/boards",
        json={"title": "Sprint 1", "template_id": "tmpl-scrum"},
        cookies=_user_cookies,
        headers=CSRF_HEADER,
    )
    assert resp.status_code == 200
    board_id = resp.json()["id"]

    # Verify columns match Scrum template
    board = _client.get(f"/api/boards/{board_id}", cookies=_user_cookies).json()
    column_titles = [c["title"] for c in board["columns"]]
    assert "Product Backlog" in column_titles
    assert "Sprint Backlog" in column_titles
    assert "Retrospective" in column_titles


def test_template_list():
    resp = _client.get("/api/templates", cookies=_user_cookies)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["templates"]) >= 3


# --- User profile ---

def test_user_profile():
    resp = _client.get("/api/auth/profile", cookies=_user_cookies)
    assert resp.status_code == 200
    data = resp.json()
    assert data["username"] == "user"
    assert "board_count" in data
    assert data["board_count"] >= 1


# --- Notification mark all read ---

def test_mark_all_notifications_read():
    notif_resp = _client.get("/api/notifications", cookies=_second_cookies)
    assert notif_resp.status_code == 200

    mark_resp = _client.put(
        "/api/notifications/read-all",
        cookies=_second_cookies,
        headers=CSRF_HEADER,
    )
    assert mark_resp.status_code == 200

    # Verify all read
    unread_resp = _client.get("/api/notifications?unread=true", cookies=_second_cookies)
    assert len(unread_resp.json()["notifications"]) == 0
