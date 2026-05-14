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
    client.post("/api/auth/register", json={"username": "mileuser", "password": "password"}, headers=CSRF_HEADER)
    resp = client.post("/api/auth/login", json={"username": "mileuser", "password": "password"}, headers=CSRF_HEADER)
    AUTH_COOKIES["session_token"] = resp.cookies["session_token"]


def create_test_board(title="Milestone Board") -> str:
    _ensure_login()
    resp = client.post("/api/boards", json={"title": title}, cookies=AUTH_COOKIES, headers=CSRF_HEADER)
    assert resp.status_code == 200
    return resp.json()["id"]


def test_create_milestone():
    board_id = create_test_board()
    resp = client.post(f"/api/boards/{board_id}/milestones", json={"name": "v1.0 Release", "description": "First release"}, cookies=AUTH_COOKIES, headers=CSRF_HEADER)
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "v1.0 Release"
    assert data["description"] == "First release"
    assert data["status"] == "upcoming"
    assert data["id"].startswith("mile-")


def test_list_milestones():
    board_id = create_test_board()
    client.post(f"/api/boards/{board_id}/milestones", json={"name": "M1"}, cookies=AUTH_COOKIES, headers=CSRF_HEADER)
    client.post(f"/api/boards/{board_id}/milestones", json={"name": "M2"}, cookies=AUTH_COOKIES, headers=CSRF_HEADER)

    resp = client.get(f"/api/boards/{board_id}/milestones", cookies=AUTH_COOKIES, headers=CSRF_HEADER)
    assert resp.status_code == 200
    milestones = resp.json()["milestones"]
    assert len(milestones) >= 2


def test_update_milestone():
    board_id = create_test_board()
    create_resp = client.post(f"/api/boards/{board_id}/milestones", json={"name": "Upd Milestone"}, cookies=AUTH_COOKIES, headers=CSRF_HEADER)
    mile_id = create_resp.json()["id"]

    resp = client.put(f"/api/milestones/{mile_id}", json={"status": "in_progress"}, cookies=AUTH_COOKIES, headers=CSRF_HEADER)
    assert resp.status_code == 200

    list_resp = client.get(f"/api/boards/{board_id}/milestones", cookies=AUTH_COOKIES, headers=CSRF_HEADER)
    updated = [m for m in list_resp.json()["milestones"] if m["id"] == mile_id][0]
    assert updated["status"] == "in_progress"


def test_update_milestone_invalid_status():
    board_id = create_test_board()
    create_resp = client.post(f"/api/boards/{board_id}/milestones", json={"name": "Bad Status"}, cookies=AUTH_COOKIES, headers=CSRF_HEADER)
    mile_id = create_resp.json()["id"]

    resp = client.put(f"/api/milestones/{mile_id}", json={"status": "invalid"}, cookies=AUTH_COOKIES, headers=CSRF_HEADER)
    assert resp.status_code == 422


def test_delete_milestone():
    board_id = create_test_board()
    create_resp = client.post(f"/api/boards/{board_id}/milestones", json={"name": "Del Milestone"}, cookies=AUTH_COOKIES, headers=CSRF_HEADER)
    mile_id = create_resp.json()["id"]

    resp = client.delete(f"/api/milestones/{mile_id}", cookies=AUTH_COOKIES, headers=CSRF_HEADER)
    assert resp.status_code == 200

    list_resp = client.get(f"/api/boards/{board_id}/milestones", cookies=AUTH_COOKIES, headers=CSRF_HEADER)
    ids = [m["id"] for m in list_resp.json()["milestones"]]
    assert mile_id not in ids


def test_milestone_with_due_date():
    board_id = create_test_board()
    resp = client.post(f"/api/boards/{board_id}/milestones", json={
        "name": "Dated Milestone",
        "due_date": "2026-06-30",
    }, cookies=AUTH_COOKIES, headers=CSRF_HEADER)
    assert resp.status_code == 200
    assert resp.json()["due_date"] == "2026-06-30"


def test_milestone_name_required():
    board_id = create_test_board()
    resp = client.post(f"/api/boards/{board_id}/milestones", json={"name": ""}, cookies=AUTH_COOKIES, headers=CSRF_HEADER)
    assert resp.status_code == 422
