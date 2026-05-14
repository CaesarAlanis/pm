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


def get_first_board() -> dict:
    board_id = get_first_board_id()
    return client.get(f"/api/boards/{board_id}", cookies=AUTH_COOKIES).json()


def test_list_boards():
    response = client.get("/api/boards", cookies=AUTH_COOKIES)
    assert response.status_code == 200
    data = response.json()
    assert "boards" in data
    assert len(data["boards"]) >= 1
    assert data["boards"][0]["title"] == "My Board"


def test_get_board():
    board = get_first_board()
    assert board["title"] == "My Board"
    assert len(board["columns"]) == 5
    assert board["columns"][0]["title"] == "Backlog"


def test_get_board_unauthenticated():
    fresh = TestClient(app)
    assert fresh.get("/api/boards").status_code == 401


def test_create_board():
    response = client.post(
        "/api/boards",
        json={"title": "Second Board"},
        cookies=AUTH_COOKIES,
        headers=CSRF_HEADER,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Second Board"
    assert "id" in data

    boards = client.get("/api/boards", cookies=AUTH_COOKIES).json()["boards"]
    assert len(boards) >= 2


def test_rename_board():
    board_id = get_first_board_id()
    response = client.put(
        f"/api/boards/{board_id}",
        json={"title": "Renamed Board"},
        cookies=AUTH_COOKIES,
        headers=CSRF_HEADER,
    )
    assert response.status_code == 200

    board = client.get(f"/api/boards/{board_id}", cookies=AUTH_COOKIES).json()
    assert board["title"] == "Renamed Board"

    # Revert
    client.put(f"/api/boards/{board_id}", json={"title": "My Board"}, cookies=AUTH_COOKIES, headers=CSRF_HEADER)


def test_delete_board():
    # Create a board to delete
    resp = client.post("/api/boards", json={"title": "To Delete"}, cookies=AUTH_COOKIES, headers=CSRF_HEADER)
    board_id = resp.json()["id"]

    response = client.delete(f"/api/boards/{board_id}", cookies=AUTH_COOKIES, headers=CSRF_HEADER)
    assert response.status_code == 200

    response = client.get(f"/api/boards/{board_id}", cookies=AUTH_COOKIES)
    assert response.status_code == 404


def test_add_column():
    board_id = get_first_board_id()
    response = client.post(
        "/api/boards/columns",
        json={"board_id": board_id, "title": "New Column"},
        cookies=AUTH_COOKIES,
        headers=CSRF_HEADER,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "New Column"
    assert "id" in data


def test_delete_column():
    board_id = get_first_board_id()
    # Create a column to delete
    resp = client.post(
        "/api/boards/columns",
        json={"board_id": board_id, "title": "Delete Me"},
        cookies=AUTH_COOKIES,
        headers=CSRF_HEADER,
    )
    col_id = resp.json()["id"]

    response = client.delete(f"/api/boards/columns/{col_id}", cookies=AUTH_COOKIES, headers=CSRF_HEADER)
    assert response.status_code == 200


def test_delete_column_not_found():
    response = client.delete("/api/boards/columns/col-nonexistent", cookies=AUTH_COOKIES, headers=CSRF_HEADER)
    assert response.status_code == 404


def test_rename_column():
    response = client.put(
        "/api/boards/columns/col-backlog",
        json={"title": "Todo"},
        cookies=AUTH_COOKIES,
        headers=CSRF_HEADER,
    )
    assert response.status_code == 200

    board = get_first_board()
    assert board["columns"][0]["title"] == "Todo"

    # Revert
    client.put("/api/boards/columns/col-backlog", json={"title": "Backlog"}, cookies=AUTH_COOKIES, headers=CSRF_HEADER)


def test_rename_column_missing_title():
    response = client.put(
        "/api/boards/columns/col-backlog",
        json={},
        cookies=AUTH_COOKIES,
        headers=CSRF_HEADER,
    )
    assert response.status_code in (400, 422)


def test_rename_column_not_found():
    response = client.put(
        "/api/boards/columns/col-nonexistent",
        json={"title": "X"},
        cookies=AUTH_COOKIES,
        headers=CSRF_HEADER,
    )
    assert response.status_code == 404


def test_add_card():
    response = client.post(
        "/api/boards/cards",
        json={"column_id": "col-backlog", "id": "card-test1", "title": "Test card", "details": "Test details"},
        cookies=AUTH_COOKIES,
        headers=CSRF_HEADER,
    )
    assert response.status_code == 200

    board = get_first_board()
    backlog = board["columns"][0]
    card_titles = [c["title"] for c in backlog["cards"]]
    assert "Test card" in card_titles


def test_add_card_missing_fields():
    response = client.post(
        "/api/boards/cards",
        json={"column_id": "col-backlog"},
        cookies=AUTH_COOKIES,
        headers=CSRF_HEADER,
    )
    assert response.status_code in (400, 422)


def test_update_card():
    response = client.put(
        "/api/boards/cards/card-1",
        json={"title": "Updated title", "details": "Updated details"},
        cookies=AUTH_COOKIES,
        headers=CSRF_HEADER,
    )
    assert response.status_code == 200


def test_update_card_not_found():
    response = client.put(
        "/api/boards/cards/card-nonexistent",
        json={"title": "X"},
        cookies=AUTH_COOKIES,
        headers=CSRF_HEADER,
    )
    assert response.status_code == 404


def test_delete_card():
    client.post(
        "/api/boards/cards",
        json={"column_id": "col-backlog", "id": "card-del1", "title": "To delete"},
        cookies=AUTH_COOKIES,
        headers=CSRF_HEADER,
    )
    response = client.delete("/api/boards/cards/card-del1", cookies=AUTH_COOKIES, headers=CSRF_HEADER)
    assert response.status_code == 200


def test_delete_card_not_found():
    response = client.delete("/api/boards/cards/card-nonexistent", cookies=AUTH_COOKIES, headers=CSRF_HEADER)
    assert response.status_code == 404


def test_move_card_same_column():
    response = client.put(
        "/api/boards/cards/card-1/move",
        json={"column_id": "col-backlog", "position": 1},
        cookies=AUTH_COOKIES,
        headers=CSRF_HEADER,
    )
    assert response.status_code == 200

    # Move back
    client.put(
        "/api/boards/cards/card-1/move",
        json={"column_id": "col-backlog", "position": 0},
        cookies=AUTH_COOKIES,
        headers=CSRF_HEADER,
    )


def test_move_card_across_columns():
    response = client.put(
        "/api/boards/cards/card-1/move",
        json={"column_id": "col-discovery", "position": 0},
        cookies=AUTH_COOKIES,
        headers=CSRF_HEADER,
    )
    assert response.status_code == 200

    # Move back
    client.put(
        "/api/boards/cards/card-1/move",
        json={"column_id": "col-backlog", "position": 0},
        cookies=AUTH_COOKIES,
        headers=CSRF_HEADER,
    )


def test_move_card_not_found():
    response = client.put(
        "/api/boards/cards/card-nonexistent/move",
        json={"column_id": "col-backlog", "position": 0},
        cookies=AUTH_COOKIES,
        headers=CSRF_HEADER,
    )
    assert response.status_code == 404


def test_move_card_missing_fields():
    response = client.put(
        "/api/boards/cards/card-1/move",
        json={"column_id": "col-backlog"},
        cookies=AUTH_COOKIES,
        headers=CSRF_HEADER,
    )
    assert response.status_code in (400, 422)
