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
    client.post("/api/auth/register", json={"username": "sprintuser", "password": "password"}, headers=CSRF_HEADER)
    resp = client.post("/api/auth/login", json={"username": "sprintuser", "password": "password"}, headers=CSRF_HEADER)
    AUTH_COOKIES["session_token"] = resp.cookies["session_token"]


def create_test_board(title="Sprint Board") -> str:
    _ensure_login()
    resp = client.post("/api/boards", json={"title": title}, cookies=AUTH_COOKIES, headers=CSRF_HEADER)
    assert resp.status_code == 200
    return resp.json()["id"]


def create_test_card(column_id: str, title="Sprint Card") -> str:
    resp = client.post("/api/boards/cards", json={"column_id": column_id, "title": title}, cookies=AUTH_COOKIES, headers=CSRF_HEADER)
    assert resp.status_code == 200
    return resp.json()["id"]


def test_create_sprint():
    board_id = create_test_board()
    resp = client.post(f"/api/boards/{board_id}/sprints", json={"name": "Sprint 1", "goal": "Ship features"}, cookies=AUTH_COOKIES, headers=CSRF_HEADER)
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Sprint 1"
    assert data["goal"] == "Ship features"
    assert data["status"] == "planning"
    assert data["id"].startswith("sprint-")


def test_list_sprints():
    board_id = create_test_board()
    client.post(f"/api/boards/{board_id}/sprints", json={"name": "Sprint A"}, cookies=AUTH_COOKIES, headers=CSRF_HEADER)
    client.post(f"/api/boards/{board_id}/sprints", json={"name": "Sprint B"}, cookies=AUTH_COOKIES, headers=CSRF_HEADER)

    resp = client.get(f"/api/boards/{board_id}/sprints", cookies=AUTH_COOKIES, headers=CSRF_HEADER)
    assert resp.status_code == 200
    sprints = resp.json()["sprints"]
    assert len(sprints) >= 2
    names = [s["name"] for s in sprints]
    assert "Sprint A" in names
    assert "Sprint B" in names


def test_get_sprint():
    board_id = create_test_board()
    create_resp = client.post(f"/api/boards/{board_id}/sprints", json={"name": "Get Sprint"}, cookies=AUTH_COOKIES, headers=CSRF_HEADER)
    sprint_id = create_resp.json()["id"]

    resp = client.get(f"/api/sprints/{sprint_id}", cookies=AUTH_COOKIES, headers=CSRF_HEADER)
    assert resp.status_code == 200
    assert resp.json()["name"] == "Get Sprint"


def test_update_sprint_status():
    board_id = create_test_board()
    create_resp = client.post(f"/api/boards/{board_id}/sprints", json={"name": "Status Sprint"}, cookies=AUTH_COOKIES, headers=CSRF_HEADER)
    sprint_id = create_resp.json()["id"]

    resp = client.put(f"/api/sprints/{sprint_id}", json={"status": "active"}, cookies=AUTH_COOKIES, headers=CSRF_HEADER)
    assert resp.status_code == 200

    get_resp = client.get(f"/api/sprints/{sprint_id}", cookies=AUTH_COOKIES, headers=CSRF_HEADER)
    assert get_resp.json()["status"] == "active"


def test_update_sprint_invalid_status():
    board_id = create_test_board()
    create_resp = client.post(f"/api/boards/{board_id}/sprints", json={"name": "Invalid Status"}, cookies=AUTH_COOKIES, headers=CSRF_HEADER)
    sprint_id = create_resp.json()["id"]

    resp = client.put(f"/api/sprints/{sprint_id}", json={"status": "invalid"}, cookies=AUTH_COOKIES, headers=CSRF_HEADER)
    assert resp.status_code == 422


def test_assign_card_to_sprint():
    board_id = create_test_board()
    board = client.get(f"/api/boards/{board_id}", cookies=AUTH_COOKIES).json()
    column_id = board["columns"][0]["id"]
    card_id = create_test_card(column_id, "Assignable Card")

    create_resp = client.post(f"/api/boards/{board_id}/sprints", json={"name": "Assign Sprint"}, cookies=AUTH_COOKIES, headers=CSRF_HEADER)
    sprint_id = create_resp.json()["id"]

    resp = client.post(f"/api/boards/cards/{card_id}/sprint", json={"sprint_id": sprint_id}, cookies=AUTH_COOKIES, headers=CSRF_HEADER)
    assert resp.status_code == 200
    assert resp.json()["detail"] == "Card assigned to sprint"


def test_remove_card_from_sprint():
    board_id = create_test_board()
    board = client.get(f"/api/boards/{board_id}", cookies=AUTH_COOKIES).json()
    column_id = board["columns"][0]["id"]
    card_id = create_test_card(column_id, "Removable Card")

    create_resp = client.post(f"/api/boards/{board_id}/sprints", json={"name": "Remove Sprint"}, cookies=AUTH_COOKIES, headers=CSRF_HEADER)
    sprint_id = create_resp.json()["id"]

    client.post(f"/api/boards/cards/{card_id}/sprint", json={"sprint_id": sprint_id}, cookies=AUTH_COOKIES, headers=CSRF_HEADER)
    resp = client.delete(f"/api/boards/cards/{card_id}/sprint", cookies=AUTH_COOKIES, headers=CSRF_HEADER)
    assert resp.status_code == 200


def test_sprint_with_dates():
    board_id = create_test_board()
    resp = client.post(f"/api/boards/{board_id}/sprints", json={
        "name": "Dated Sprint",
        "start_date": "2026-01-01",
        "end_date": "2026-01-14",
    }, cookies=AUTH_COOKIES, headers=CSRF_HEADER)
    assert resp.status_code == 200
    data = resp.json()
    assert data["start_date"] == "2026-01-01"
    assert data["end_date"] == "2026-01-14"
