import os
import tempfile
from fastapi.testclient import TestClient

from main import app

DB_PATH_BACKUP = None


def setup_module():
    global DB_PATH_BACKUP
    from app import db
    DB_PATH_BACKUP = os.environ.get("DB_PATH")
    tmp = tempfile.mktemp(suffix=".db")
    os.environ["DB_PATH"] = tmp
    db.DB_PATH = tmp
    db.ensure_db()


def teardown_module():
    global DB_PATH_BACKUP
    from app import db
    if DB_PATH_BACKUP is None:
        os.environ.pop("DB_PATH", None)
    else:
        os.environ["DB_PATH"] = DB_PATH_BACKUP
    db.DB_PATH = os.environ.get("DB_PATH", str(db.Path(__file__).parent.parent / "data" / "pm.db"))
    if os.environ.get("DB_PATH") and os.path.exists(os.environ["DB_PATH"]):
        os.unlink(os.environ["DB_PATH"])


client = TestClient(app)

AUTH_COOKIES = {}


def login():
    resp = client.post("/api/auth/login", json={"username": "user", "password": "password"})
    AUTH_COOKIES["session_token"] = resp.cookies["session_token"]


login()


def test_get_board():
    response = client.get("/api/boards", cookies=AUTH_COOKIES)
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "My Board"
    assert len(data["columns"]) == 5
    assert data["columns"][0]["title"] == "Backlog"


def test_get_board_unauthenticated():
    fresh = TestClient(app)
    assert fresh.get("/api/boards").status_code == 401


def test_rename_column():
    response = client.put(
        "/api/boards/columns/col-backlog",
        json={"title": "Todo"},
        cookies=AUTH_COOKIES,
    )
    assert response.status_code == 200

    board = client.get("/api/boards", cookies=AUTH_COOKIES).json()
    assert board["columns"][0]["title"] == "Todo"

    # Revert
    client.put("/api/boards/columns/col-backlog", json={"title": "Backlog"}, cookies=AUTH_COOKIES)


def test_rename_column_missing_title():
    response = client.put(
        "/api/boards/columns/col-backlog",
        json={},
        cookies=AUTH_COOKIES,
    )
    assert response.status_code == 400


def test_rename_column_not_found():
    response = client.put(
        "/api/boards/columns/col-nonexistent",
        json={"title": "X"},
        cookies=AUTH_COOKIES,
    )
    assert response.status_code == 404


def test_add_card():
    response = client.post(
        "/api/boards/cards",
        json={"column_id": "col-backlog", "id": "card-test1", "title": "Test card", "details": "Test details"},
        cookies=AUTH_COOKIES,
    )
    assert response.status_code == 200

    board = client.get("/api/boards", cookies=AUTH_COOKIES).json()
    backlog = board["columns"][0]
    card_titles = [c["title"] for c in backlog["cards"]]
    assert "Test card" in card_titles


def test_add_card_missing_fields():
    response = client.post(
        "/api/boards/cards",
        json={"column_id": "col-backlog"},
        cookies=AUTH_COOKIES,
    )
    assert response.status_code == 400


def test_update_card():
    response = client.put(
        "/api/boards/cards/card-1",
        json={"title": "Updated title", "details": "Updated details"},
        cookies=AUTH_COOKIES,
    )
    assert response.status_code == 200


def test_update_card_not_found():
    response = client.put(
        "/api/boards/cards/card-nonexistent",
        json={"title": "X"},
        cookies=AUTH_COOKIES,
    )
    assert response.status_code == 404


def test_delete_card():
    client.post(
        "/api/boards/cards",
        json={"column_id": "col-backlog", "id": "card-del1", "title": "To delete"},
        cookies=AUTH_COOKIES,
    )
    response = client.delete("/api/boards/cards/card-del1", cookies=AUTH_COOKIES)
    assert response.status_code == 200


def test_delete_card_not_found():
    response = client.delete("/api/boards/cards/card-nonexistent", cookies=AUTH_COOKIES)
    assert response.status_code == 404


def test_move_card_same_column():
    response = client.put(
        "/api/boards/cards/card-1/move",
        json={"column_id": "col-backlog", "position": 1},
        cookies=AUTH_COOKIES,
    )
    assert response.status_code == 200

    # Move back
    client.put(
        "/api/boards/cards/card-1/move",
        json={"column_id": "col-backlog", "position": 0},
        cookies=AUTH_COOKIES,
    )


def test_move_card_across_columns():
    response = client.put(
        "/api/boards/cards/card-1/move",
        json={"column_id": "col-discovery", "position": 0},
        cookies=AUTH_COOKIES,
    )
    assert response.status_code == 200

    # Move back
    client.put(
        "/api/boards/cards/card-1/move",
        json={"column_id": "col-backlog", "position": 0},
        cookies=AUTH_COOKIES,
    )


def test_move_card_not_found():
    response = client.put(
        "/api/boards/cards/card-nonexistent/move",
        json={"column_id": "col-backlog", "position": 0},
        cookies=AUTH_COOKIES,
    )
    assert response.status_code == 404


def test_move_card_missing_fields():
    response = client.put(
        "/api/boards/cards/card-1/move",
        json={"column_id": "col-backlog"},
        cookies=AUTH_COOKIES,
    )
    assert response.status_code == 400
