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


def create_test_board(title="Test Board") -> str:
    resp = client.post("/api/boards", json={"title": title}, cookies=AUTH_COOKIES, headers=CSRF_HEADER)
    assert resp.status_code == 200
    return resp.json()["id"]


def test_archive_board():
    board_id = create_test_board("Archive Test")
    resp = client.put(f"/api/boards/{board_id}/archive", cookies=AUTH_COOKIES, headers=CSRF_HEADER)
    assert resp.status_code == 200
    assert resp.json()["detail"] == "Board archived"

    board = client.get(f"/api/boards/{board_id}", cookies=AUTH_COOKIES).json()
    assert board["archived"] == 1


def test_archived_board_hidden_from_list():
    board_id = create_test_board("Hidden Test")
    client.put(f"/api/boards/{board_id}/archive", cookies=AUTH_COOKIES, headers=CSRF_HEADER)

    # Default list should not include archived
    boards = client.get("/api/boards", cookies=AUTH_COOKIES).json()["boards"]
    assert not any(b["id"] == board_id for b in boards)

    # include_archived=true should include it
    boards = client.get("/api/boards?include_archived=true", cookies=AUTH_COOKIES).json()["boards"]
    assert any(b["id"] == board_id for b in boards)


def test_unarchive_board():
    board_id = create_test_board("Unarchive Test")
    client.put(f"/api/boards/{board_id}/archive", cookies=AUTH_COOKIES, headers=CSRF_HEADER)

    resp = client.put(f"/api/boards/{board_id}/unarchive", cookies=AUTH_COOKIES, headers=CSRF_HEADER)
    assert resp.status_code == 200

    board = client.get(f"/api/boards/{board_id}", cookies=AUTH_COOKIES).json()
    assert board["archived"] == 0

    boards = client.get("/api/boards", cookies=AUTH_COOKIES).json()["boards"]
    assert any(b["id"] == board_id for b in boards)


def test_toggle_favorite():
    board_id = create_test_board("Favorite Test")

    resp = client.put(f"/api/boards/{board_id}/favorite", cookies=AUTH_COOKIES, headers=CSRF_HEADER)
    assert resp.status_code == 200

    board = client.get(f"/api/boards/{board_id}", cookies=AUTH_COOKIES).json()
    assert board["favorite"] == 1

    client.put(f"/api/boards/{board_id}/favorite", cookies=AUTH_COOKIES, headers=CSRF_HEADER)
    board = client.get(f"/api/boards/{board_id}", cookies=AUTH_COOKIES).json()
    assert board["favorite"] == 0


def test_update_board_description():
    board_id = create_test_board("Desc Test")
    resp = client.put(
        f"/api/boards/{board_id}/description",
        json={"description": "Sprint 4 planning board"},
        cookies=AUTH_COOKIES,
        headers=CSRF_HEADER,
    )
    assert resp.status_code == 200

    board = client.get(f"/api/boards/{board_id}", cookies=AUTH_COOKIES).json()
    assert board["description"] == "Sprint 4 planning board"


def test_board_returns_new_fields():
    board_id = create_test_board("Fields Test")
    board = client.get(f"/api/boards/{board_id}", cookies=AUTH_COOKIES).json()
    assert "description" in board
    assert "archived" in board
    assert "favorite" in board
    assert "updated_at" in board


def test_board_list_returns_new_fields():
    board_id = create_test_board("List Fields Test")
    boards = client.get("/api/boards", cookies=AUTH_COOKIES).json()["boards"]
    b = next(x for x in boards if x["id"] == board_id)
    assert "description" in b
    assert "archived" in b
    assert "favorite" in b
    assert "updated_at" in b


def test_create_board_with_description():
    resp = client.post(
        "/api/boards",
        json={"title": "Desc Board", "description": "A board with a description"},
        cookies=AUTH_COOKIES,
        headers=CSRF_HEADER,
    )
    assert resp.status_code == 200
    board_id = resp.json()["id"]

    board = client.get(f"/api/boards/{board_id}", cookies=AUTH_COOKIES).json()
    assert board["description"] == "A board with a description"


def test_archive_nonexistent_board():
    resp = client.put("/api/boards/board-nonexistent/archive", cookies=AUTH_COOKIES, headers=CSRF_HEADER)
    assert resp.status_code == 404


def test_favorite_nonexistent_board():
    resp = client.put("/api/boards/board-nonexistent/favorite", cookies=AUTH_COOKIES, headers=CSRF_HEADER)
    assert resp.status_code == 404


def test_updated_at_set_on_rename():
    board_id = create_test_board("Updated At Test")
    board = client.get(f"/api/boards/{board_id}", cookies=AUTH_COOKIES).json()
    assert board["updated_at"] is None  # Fresh board

    client.put(f"/api/boards/{board_id}", json={"title": "Updated Title"}, cookies=AUTH_COOKIES, headers=CSRF_HEADER)
    board = client.get(f"/api/boards/{board_id}", cookies=AUTH_COOKIES).json()
    assert board["updated_at"] is not None
