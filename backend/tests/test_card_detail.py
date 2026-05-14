import os
import tempfile
from pathlib import Path
from fastapi.testclient import TestClient

from main import app
from app.db import connection

DB_PATH_BACKUP = None

CSRF_HEADER = {"X-Requested-With": "fetch"}


def setup_module():
    global DB_PATH_BACKUP
    DB_PATH_BACKUP = os.environ.get("DB_PATH")
    tmp = tempfile.mktemp(suffix=".db")
    os.environ["DB_PATH"] = tmp
    connection.DB_PATH = tmp
    from app.db import ensure_db
    ensure_db()


def teardown_module():
    global DB_PATH_BACKUP
    if DB_PATH_BACKUP is None:
        os.environ.pop("DB_PATH", None)
    else:
        os.environ["DB_PATH"] = DB_PATH_BACKUP
    connection.DB_PATH = os.environ.get("DB_PATH", str(Path(__file__).parent.parent / "data" / "pm.db"))
    if os.environ.get("DB_PATH") and os.path.exists(os.environ.get("DB_PATH", "")):
        os.unlink(os.environ["DB_PATH"])


client = TestClient(app)

AUTH_COOKIES = {}


def login():
    resp = client.post("/api/auth/login", json={"username": "user", "password": "password"}, headers=CSRF_HEADER)
    AUTH_COOKIES["session_token"] = resp.cookies["session_token"]


login()


def register_second_user():
    client.post("/api/auth/register", json={"username": "collaborator", "password": "password123"}, headers=CSRF_HEADER)


def get_first_card_id() -> str:
    boards = client.get("/api/boards", cookies=AUTH_COOKIES).json()["boards"]
    board_id = boards[0]["id"]
    board = client.get(f"/api/boards/{board_id}", cookies=AUTH_COOKIES).json()
    return board["columns"][0]["cards"][0]["id"]


# --- Comment Tests ---

def test_add_comment():
    card_id = get_first_card_id()
    response = client.post(
        f"/api/boards/cards/{card_id}/comments",
        json={"content": "This is a test comment"},
        cookies=AUTH_COOKIES,
        headers=CSRF_HEADER,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["content"] == "This is a test comment"
    assert data["username"] == "user"
    assert data["id"].startswith("cmt-")


def test_list_comments():
    card_id = get_first_card_id()
    response = client.get(
        f"/api/boards/cards/{card_id}/comments",
        cookies=AUTH_COOKIES,
    )
    assert response.status_code == 200
    data = response.json()
    assert "comments" in data
    assert isinstance(data["comments"], list)


def test_update_comment():
    card_id = get_first_card_id()
    create_resp = client.post(
        f"/api/boards/cards/{card_id}/comments",
        json={"content": "Original comment"},
        cookies=AUTH_COOKIES,
        headers=CSRF_HEADER,
    )
    comment_id = create_resp.json()["id"]

    response = client.put(
        f"/api/boards/comments/{comment_id}",
        json={"content": "Updated comment"},
        cookies=AUTH_COOKIES,
        headers=CSRF_HEADER,
    )
    assert response.status_code == 200


def test_delete_comment():
    card_id = get_first_card_id()
    create_resp = client.post(
        f"/api/boards/cards/{card_id}/comments",
        json={"content": "To delete"},
        cookies=AUTH_COOKIES,
        headers=CSRF_HEADER,
    )
    comment_id = create_resp.json()["id"]

    response = client.delete(
        f"/api/boards/comments/{comment_id}",
        cookies=AUTH_COOKIES,
        headers=CSRF_HEADER,
    )
    assert response.status_code == 200


def test_comment_empty_content_rejected():
    card_id = get_first_card_id()
    response = client.post(
        f"/api/boards/cards/{card_id}/comments",
        json={"content": "   "},
        cookies=AUTH_COOKIES,
        headers=CSRF_HEADER,
    )
    assert response.status_code in (400, 422)


def test_comment_nonexistent_card():
    response = client.post(
        "/api/boards/cards/card-nonexistent/comments",
        json={"content": "Test"},
        cookies=AUTH_COOKIES,
        headers=CSRF_HEADER,
    )
    assert response.status_code in (400, 403)


# --- Assignee Tests ---

def test_assign_user():
    register_second_user()
    card_id = get_first_card_id()
    response = client.post(
        f"/api/boards/cards/{card_id}/assignees",
        json={"username": "collaborator"},
        cookies=AUTH_COOKIES,
        headers=CSRF_HEADER,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "collaborator"


def test_list_assignees():
    card_id = get_first_card_id()
    response = client.get(
        f"/api/boards/cards/{card_id}/assignees",
        cookies=AUTH_COOKIES,
    )
    assert response.status_code == 200
    data = response.json()
    assert "assignees" in data


def test_assign_nonexistent_user():
    card_id = get_first_card_id()
    response = client.post(
        f"/api/boards/cards/{card_id}/assignees",
        json={"username": "nonexistent"},
        cookies=AUTH_COOKIES,
        headers=CSRF_HEADER,
    )
    assert response.status_code == 400


def test_unassign_user():
    card_id = get_first_card_id()
    client.post(
        f"/api/boards/cards/{card_id}/assignees",
        json={"username": "collaborator"},
        cookies=AUTH_COOKIES,
        headers=CSRF_HEADER,
    )
    response = client.delete(
        f"/api/boards/cards/{card_id}/assignees/collaborator",
        cookies=AUTH_COOKIES,
        headers=CSRF_HEADER,
    )
    assert response.status_code == 200


def test_double_assign():
    card_id = get_first_card_id()
    client.post(
        f"/api/boards/cards/{card_id}/assignees",
        json={"username": "collaborator"},
        cookies=AUTH_COOKIES,
        headers=CSRF_HEADER,
    )
    response = client.post(
        f"/api/boards/cards/{card_id}/assignees",
        json={"username": "collaborator"},
        cookies=AUTH_COOKIES,
        headers=CSRF_HEADER,
    )
    assert response.status_code == 400


# --- Checklist Tests ---

def test_add_checklist():
    card_id = get_first_card_id()
    response = client.post(
        f"/api/boards/cards/{card_id}/checklists",
        json={"title": "Implementation Steps"},
        cookies=AUTH_COOKIES,
        headers=CSRF_HEADER,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Implementation Steps"
    assert data["id"].startswith("chl-")


def test_list_checklists():
    card_id = get_first_card_id()
    response = client.get(
        f"/api/boards/cards/{card_id}/checklists",
        cookies=AUTH_COOKIES,
    )
    assert response.status_code == 200
    data = response.json()
    assert "checklists" in data


def test_add_checklist_item():
    card_id = get_first_card_id()
    cl_resp = client.post(
        f"/api/boards/cards/{card_id}/checklists",
        json={"title": "Steps"},
        cookies=AUTH_COOKIES,
        headers=CSRF_HEADER,
    )
    checklist_id = cl_resp.json()["id"]

    response = client.post(
        f"/api/boards/checklists/{checklist_id}/items",
        json={"content": "First step"},
        cookies=AUTH_COOKIES,
        headers=CSRF_HEADER,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["content"] == "First step"
    assert data["checked"] == 0


def test_toggle_checklist_item():
    card_id = get_first_card_id()
    cl_resp = client.post(
        f"/api/boards/cards/{card_id}/checklists",
        json={"title": "Toggle Test"},
        cookies=AUTH_COOKIES,
        headers=CSRF_HEADER,
    )
    checklist_id = cl_resp.json()["id"]

    item_resp = client.post(
        f"/api/boards/checklists/{checklist_id}/items",
        json={"content": "Toggle me"},
        cookies=AUTH_COOKIES,
        headers=CSRF_HEADER,
    )
    item_id = item_resp.json()["id"]

    response = client.put(
        f"/api/boards/checklist-items/{item_id}/toggle",
        json={"checked": True},
        cookies=AUTH_COOKIES,
        headers=CSRF_HEADER,
    )
    assert response.status_code == 200


def test_delete_checklist_item():
    card_id = get_first_card_id()
    cl_resp = client.post(
        f"/api/boards/cards/{card_id}/checklists",
        json={"title": "Delete Item Test"},
        cookies=AUTH_COOKIES,
        headers=CSRF_HEADER,
    )
    checklist_id = cl_resp.json()["id"]

    item_resp = client.post(
        f"/api/boards/checklists/{checklist_id}/items",
        json={"content": "Delete me"},
        cookies=AUTH_COOKIES,
        headers=CSRF_HEADER,
    )
    item_id = item_resp.json()["id"]

    response = client.delete(
        f"/api/boards/checklist-items/{item_id}",
        cookies=AUTH_COOKIES,
        headers=CSRF_HEADER,
    )
    assert response.status_code == 200


def test_delete_checklist():
    card_id = get_first_card_id()
    cl_resp = client.post(
        f"/api/boards/cards/{card_id}/checklists",
        json={"title": "Delete Me"},
        cookies=AUTH_COOKIES,
        headers=CSRF_HEADER,
    )
    checklist_id = cl_resp.json()["id"]

    response = client.delete(
        f"/api/boards/checklists/{checklist_id}",
        cookies=AUTH_COOKIES,
        headers=CSRF_HEADER,
    )
    assert response.status_code == 200


def test_checklist_empty_title_rejected():
    card_id = get_first_card_id()
    response = client.post(
        f"/api/boards/cards/{card_id}/checklists",
        json={"title": "   "},
        cookies=AUTH_COOKIES,
        headers=CSRF_HEADER,
    )
    assert response.status_code in (400, 422)
