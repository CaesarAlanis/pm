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


def get_first_board_id() -> str:
    boards = client.get("/api/boards", cookies=AUTH_COOKIES).json()["boards"]
    return boards[0]["id"]


def test_create_card_with_story_points():
    resp = client.post(
        "/api/boards/cards",
        json={"column_id": "col-backlog", "title": "Story Card", "story_points": 5, "estimated_hours": 8.0},
        cookies=AUTH_COOKIES,
        headers=CSRF_HEADER,
    )
    assert resp.status_code == 200
    card_id = resp.json()["id"]

    board = client.get(f"/api/boards/{get_first_board_id()}", cookies=AUTH_COOKIES).json()
    col = next(c for c in board["columns"] if c["id"] == "col-backlog")
    card = next(c for c in col["cards"] if c["id"] == card_id)
    assert card["story_points"] == 5
    assert card["estimated_hours"] == 8.0


def test_update_card_story_points():
    resp = client.post(
        "/api/boards/cards",
        json={"column_id": "col-backlog", "title": "Points Card"},
        cookies=AUTH_COOKIES,
        headers=CSRF_HEADER,
    )
    card_id = resp.json()["id"]

    resp = client.put(
        f"/api/boards/cards/{card_id}",
        json={"story_points": 3, "estimated_hours": 4.5},
        cookies=AUTH_COOKIES,
        headers=CSRF_HEADER,
    )
    assert resp.status_code == 200

    board = client.get(f"/api/boards/{get_first_board_id()}", cookies=AUTH_COOKIES).json()
    col = next(c for c in board["columns"] if c["id"] == "col-backlog")
    card = next(c for c in col["cards"] if c["id"] == card_id)
    assert card["story_points"] == 3
    assert card["estimated_hours"] == 4.5


def test_card_returns_new_fields():
    board = client.get(f"/api/boards/{get_first_board_id()}", cookies=AUTH_COOKIES).json()
    for col in board["columns"]:
        for card in col["cards"]:
            assert "story_points" in card
            assert "estimated_hours" in card
            assert "actual_hours" in card


def test_card_link_relates_to():
    # Create two cards
    resp1 = client.post("/api/boards/cards", json={"column_id": "col-backlog", "title": "Card A"}, cookies=AUTH_COOKIES, headers=CSRF_HEADER)
    resp2 = client.post("/api/boards/cards", json={"column_id": "col-backlog", "title": "Card B"}, cookies=AUTH_COOKIES, headers=CSRF_HEADER)
    card_a = resp1.json()["id"]
    card_b = resp2.json()["id"]

    # Add link
    resp = client.post(
        f"/api/boards/cards/{card_a}/links",
        json={"target_card_id": card_b, "link_type": "relates_to"},
        cookies=AUTH_COOKIES,
        headers=CSRF_HEADER,
    )
    assert resp.status_code == 200
    assert resp.json()["link_type"] == "relates_to"

    # List links
    links = client.get(f"/api/boards/cards/{card_a}/links", cookies=AUTH_COOKIES).json()["links"]
    assert len(links) >= 1
    assert any(l["link_type"] == "relates_to" for l in links)


def test_card_link_blocked_by():
    resp1 = client.post("/api/boards/cards", json={"column_id": "col-backlog", "title": "Blocker"}, cookies=AUTH_COOKIES, headers=CSRF_HEADER)
    resp2 = client.post("/api/boards/cards", json={"column_id": "col-backlog", "title": "Blocked"}, cookies=AUTH_COOKIES, headers=CSRF_HEADER)
    blocker = resp1.json()["id"]
    blocked = resp2.json()["id"]

    resp = client.post(
        f"/api/boards/cards/{blocked}/links",
        json={"target_card_id": blocker, "link_type": "blocked_by"},
        cookies=AUTH_COOKIES,
        headers=CSRF_HEADER,
    )
    assert resp.status_code == 200

    links = client.get(f"/api/boards/cards/{blocked}/links", cookies=AUTH_COOKIES).json()["links"]
    assert any(l["link_type"] == "blocked_by" for l in links)


def test_card_link_self_link_rejected():
    resp1 = client.post("/api/boards/cards", json={"column_id": "col-backlog", "title": "Self"}, cookies=AUTH_COOKIES, headers=CSRF_HEADER)
    card_id = resp1.json()["id"]

    resp = client.post(
        f"/api/boards/cards/{card_id}/links",
        json={"target_card_id": card_id, "link_type": "relates_to"},
        cookies=AUTH_COOKIES,
        headers=CSRF_HEADER,
    )
    assert resp.status_code == 400


def test_card_link_duplicate_rejected():
    resp1 = client.post("/api/boards/cards", json={"column_id": "col-backlog", "title": "A"}, cookies=AUTH_COOKIES, headers=CSRF_HEADER)
    resp2 = client.post("/api/boards/cards", json={"column_id": "col-backlog", "title": "B"}, cookies=AUTH_COOKIES, headers=CSRF_HEADER)
    card_a = resp1.json()["id"]
    card_b = resp2.json()["id"]

    # First link succeeds
    client.post(f"/api/boards/cards/{card_a}/links", json={"target_card_id": card_b, "link_type": "relates_to"}, cookies=AUTH_COOKIES, headers=CSRF_HEADER)
    # Duplicate fails
    resp = client.post(f"/api/boards/cards/{card_a}/links", json={"target_card_id": card_b, "link_type": "relates_to"}, cookies=AUTH_COOKIES, headers=CSRF_HEADER)
    assert resp.status_code == 400


def test_remove_card_link():
    resp1 = client.post("/api/boards/cards", json={"column_id": "col-backlog", "title": "X"}, cookies=AUTH_COOKIES, headers=CSRF_HEADER)
    resp2 = client.post("/api/boards/cards", json={"column_id": "col-backlog", "title": "Y"}, cookies=AUTH_COOKIES, headers=CSRF_HEADER)
    card_x = resp1.json()["id"]
    card_y = resp2.json()["id"]

    link = client.post(f"/api/boards/cards/{card_x}/links", json={"target_card_id": card_y, "link_type": "relates_to"}, cookies=AUTH_COOKIES, headers=CSRF_HEADER).json()

    resp = client.delete(f"/api/boards/cards/{card_x}/links/{link['id']}", cookies=AUTH_COOKIES, headers=CSRF_HEADER)
    assert resp.status_code == 200


def test_log_time():
    resp = client.post("/api/boards/cards", json={"column_id": "col-backlog", "title": "Time Card"}, cookies=AUTH_COOKIES, headers=CSRF_HEADER)
    card_id = resp.json()["id"]

    resp = client.post(
        f"/api/boards/cards/{card_id}/time",
        json={"hours": 2.5, "note": "Code review"},
        cookies=AUTH_COOKIES,
        headers=CSRF_HEADER,
    )
    assert resp.status_code == 200
    assert resp.json()["hours"] == 2.5

    # Check card actual_hours updated
    board = client.get(f"/api/boards/{get_first_board_id()}", cookies=AUTH_COOKIES).json()
    col = next(c for c in board["columns"] if c["id"] == "col-backlog")
    card = next(c for c in col["cards"] if c["id"] == card_id)
    assert card["actual_hours"] == 2.5


def test_list_time_logs():
    resp = client.post("/api/boards/cards", json={"column_id": "col-backlog", "title": "Log Card"}, cookies=AUTH_COOKIES, headers=CSRF_HEADER)
    card_id = resp.json()["id"]

    client.post(f"/api/boards/cards/{card_id}/time", json={"hours": 1.0, "note": "Setup"}, cookies=AUTH_COOKIES, headers=CSRF_HEADER)
    client.post(f"/api/boards/cards/{card_id}/time", json={"hours": 2.0, "note": "Implementation"}, cookies=AUTH_COOKIES, headers=CSRF_HEADER)

    logs = client.get(f"/api/boards/cards/{card_id}/time", cookies=AUTH_COOKIES).json()["logs"]
    assert len(logs) == 2


def test_delete_time_log():
    resp = client.post("/api/boards/cards", json={"column_id": "col-backlog", "title": "Del Time Card"}, cookies=AUTH_COOKIES, headers=CSRF_HEADER)
    card_id = resp.json()["id"]

    log = client.post(f"/api/boards/cards/{card_id}/time", json={"hours": 3.0, "note": "ToRemove"}, cookies=AUTH_COOKIES, headers=CSRF_HEADER).json()

    resp = client.delete(f"/api/boards/cards/{card_id}/time/{log['id']}", cookies=AUTH_COOKIES, headers=CSRF_HEADER)
    assert resp.status_code == 200

    # actual_hours should be decremented
    board = client.get(f"/api/boards/{get_first_board_id()}", cookies=AUTH_COOKIES).json()
    col = next(c for c in board["columns"] if c["id"] == "col-backlog")
    card = next(c for c in col["cards"] if c["id"] == card_id)
    assert card["actual_hours"] == 0


def test_log_time_negative_rejected():
    resp = client.post("/api/boards/cards", json={"column_id": "col-backlog", "title": "Neg Card"}, cookies=AUTH_COOKIES, headers=CSRF_HEADER)
    card_id = resp.json()["id"]

    resp = client.post(
        f"/api/boards/cards/{card_id}/time",
        json={"hours": -1.0},
        cookies=AUTH_COOKIES,
        headers=CSRF_HEADER,
    )
    assert resp.status_code == 422


def test_analytics_board():
    board_id = get_first_board_id()
    resp = client.get(f"/api/analytics/board/{board_id}", cookies=AUTH_COOKIES)
    assert resp.status_code == 200
    data = resp.json()
    assert "total_cards" in data
    assert "cards_by_column" in data
    assert "completion_rate" in data
    assert "overdue_count" in data


def test_analytics_dashboard():
    resp = client.get("/api/analytics/dashboard", cookies=AUTH_COOKIES)
    assert resp.status_code == 200
    data = resp.json()
    assert "total_boards" in data
    assert "total_cards" in data
    assert "overdue_cards" in data
    assert "cards_assigned_to_me" in data
