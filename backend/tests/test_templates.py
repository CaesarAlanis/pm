import os
import tempfile
from pathlib import Path
from fastapi.testclient import TestClient

from main import app
from app.db import connection
from app.db import ensure_db

DB_PATH_BACKUP = None

CSRF_HEADER = {"X-Requested-With": "fetch"}


def setup_module():
    global DB_PATH_BACKUP
    DB_PATH_BACKUP = os.environ.get("DB_PATH")
    tmp = tempfile.mktemp(suffix=".db")
    os.environ["DB_PATH"] = tmp
    connection.DB_PATH = tmp
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


def test_list_templates():
    response = client.get("/api/templates", cookies=AUTH_COOKIES)
    assert response.status_code == 200
    data = response.json()
    assert "templates" in data
    assert len(data["templates"]) >= 3
    names = [t["name"] for t in data["templates"]]
    assert "Kanban Board" in names
    assert "Scrum Sprint" in names
    assert "Bug Tracking" in names


def test_template_has_columns():
    response = client.get("/api/templates", cookies=AUTH_COOKIES)
    templates = response.json()["templates"]
    kanban = next(t for t in templates if t["name"] == "Kanban Board")
    assert kanban["columns"] == ["Backlog", "In Progress", "Review", "Done"]


def test_create_board_from_template():
    response = client.post(
        "/api/boards",
        json={"title": "Sprint Board", "template_id": "tmpl-scrum"},
        cookies=AUTH_COOKIES,
        headers=CSRF_HEADER,
    )
    assert response.status_code == 200
    board_id = response.json()["id"]

    # Verify board has scrum columns
    board = client.get(f"/api/boards/{board_id}", cookies=AUTH_COOKIES).json()
    column_titles = [c["title"] for c in board["columns"]]
    assert "Product Backlog" in column_titles
    assert "Sprint Backlog" in column_titles
    assert "Retrospective" in column_titles


def test_create_board_with_invalid_template():
    response = client.post(
        "/api/boards",
        json={"title": "Test Board", "template_id": "tmpl-nonexistent"},
        cookies=AUTH_COOKIES,
        headers=CSRF_HEADER,
    )
    assert response.status_code == 200
    # Falls back to default columns
    board_id = response.json()["id"]
    board = client.get(f"/api/boards/{board_id}", cookies=AUTH_COOKIES).json()
    assert len(board["columns"]) == 5  # Default columns


def test_templates_unauthenticated():
    fresh = TestClient(app)
    assert fresh.get("/api/templates").status_code == 401
