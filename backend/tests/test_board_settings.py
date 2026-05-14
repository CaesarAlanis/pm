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


def _ensure_login():
    if AUTH_COOKIES:
        return
    client.post("/api/auth/register", json={"username": "settingsuser", "password": "password"}, headers=CSRF_HEADER)
    resp = client.post("/api/auth/login", json={"username": "settingsuser", "password": "password"}, headers=CSRF_HEADER)
    AUTH_COOKIES["session_token"] = resp.cookies["session_token"]


def create_test_board(title="Settings Board") -> str:
    _ensure_login()
    resp = client.post("/api/boards", json={"title": title}, cookies=AUTH_COOKIES, headers=CSRF_HEADER)
    assert resp.status_code == 200
    return resp.json()["id"]


def test_update_board_settings_wip_limit():
    board_id = create_test_board()
    resp = client.put(f"/api/boards/{board_id}/settings", json={"wip_limit": 5}, cookies=AUTH_COOKIES, headers=CSRF_HEADER)
    assert resp.status_code == 200

    board = client.get(f"/api/boards/{board_id}", cookies=AUTH_COOKIES).json()
    assert board["wip_limit"] == 5


def test_update_board_settings_default_card_type():
    board_id = create_test_board()
    resp = client.put(f"/api/boards/{board_id}/settings", json={"default_card_type": "bug"}, cookies=AUTH_COOKIES, headers=CSRF_HEADER)
    assert resp.status_code == 200

    board = client.get(f"/api/boards/{board_id}", cookies=AUTH_COOKIES).json()
    assert board["default_card_type"] == "bug"


def test_update_board_settings_description():
    board_id = create_test_board()
    resp = client.put(f"/api/boards/{board_id}/settings", json={"description": "A test board"}, cookies=AUTH_COOKIES, headers=CSRF_HEADER)
    assert resp.status_code == 200

    board = client.get(f"/api/boards/{board_id}", cookies=AUTH_COOKIES).json()
    assert board["description"] == "A test board"


def test_update_board_settings_combined():
    board_id = create_test_board()
    resp = client.put(f"/api/boards/{board_id}/settings", json={
        "wip_limit": 10,
        "default_card_type": "story",
        "description": "Combined update",
    }, cookies=AUTH_COOKIES, headers=CSRF_HEADER)
    assert resp.status_code == 200

    board = client.get(f"/api/boards/{board_id}", cookies=AUTH_COOKIES).json()
    assert board["wip_limit"] == 10
    assert board["default_card_type"] == "story"
    assert board["description"] == "Combined update"


def test_update_board_settings_nonexistent_board():
    _ensure_login()
    resp = client.put("/api/boards/nonexistent/settings", json={"wip_limit": 5}, cookies=AUTH_COOKIES, headers=CSRF_HEADER)
    assert resp.status_code == 404


def test_board_settings_includes_new_fields():
    board_id = create_test_board()
    board = client.get(f"/api/boards/{board_id}", cookies=AUTH_COOKIES).json()
    assert "wip_limit" in board
    assert "default_card_type" in board
