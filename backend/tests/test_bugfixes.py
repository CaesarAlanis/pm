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


def test_move_card_no_position_collision():
    """Test that moving a card doesn't create position collisions with existing cards."""
    board_id = get_first_board_id()
    board = client.get(f"/api/boards/{board_id}", cookies=AUTH_COOKIES).json()

    # Get the first column with at least 2 cards
    col = None
    for c in board["columns"]:
        if len(c["cards"]) >= 2:
            col = c
            break
    assert col is not None, "Need a column with at least 2 cards"

    card_ids = [c["id"] for c in col["cards"]]
    first_card = card_ids[0]
    last_card = card_ids[-1]

    # Move last card to position 0
    resp = client.put(
        f"/api/boards/cards/{last_card}/move",
        json={"column_id": col["id"], "position": 0},
        cookies=AUTH_COOKIES,
        headers=CSRF_HEADER,
    )
    assert resp.status_code == 200

    # Verify no position duplicates
    board = client.get(f"/api/boards/{board_id}", cookies=AUTH_COOKIES).json()
    updated_col = next(c for c in board["columns"] if c["id"] == col["id"])
    positions = [c["position"] for c in updated_col["cards"]]
    assert len(positions) == len(set(positions)), f"Position collision detected: {positions}"

    # Move first card to end
    resp = client.put(
        f"/api/boards/cards/{first_card}/move",
        json={"column_id": col["id"], "position": len(card_ids) - 1},
        cookies=AUTH_COOKIES,
        headers=CSRF_HEADER,
    )
    assert resp.status_code == 200

    # Verify again no position duplicates
    board = client.get(f"/api/boards/{board_id}", cookies=AUTH_COOKIES).json()
    updated_col = next(c for c in board["columns"] if c["id"] == col["id"])
    positions = [c["position"] for c in updated_col["cards"]]
    assert len(positions) == len(set(positions)), f"Position collision detected: {positions}"


def test_move_card_cross_column_no_collision():
    """Test cross-column move doesn't create position collisions."""
    board_id = get_first_board_id()
    board = client.get(f"/api/boards/{board_id}", cookies=AUTH_COOKIES).json()

    src_col = board["columns"][0]
    dst_col = board["columns"][1]

    if not src_col["cards"]:
        return

    card_id = src_col["cards"][0]["id"]

    # Move to destination column at position 0
    resp = client.put(
        f"/api/boards/cards/{card_id}/move",
        json={"column_id": dst_col["id"], "position": 0},
        cookies=AUTH_COOKIES,
        headers=CSRF_HEADER,
    )
    assert resp.status_code == 200

    # Verify no position duplicates in either column
    board = client.get(f"/api/boards/{board_id}", cookies=AUTH_COOKIES).json()
    for col in board["columns"]:
        positions = [c["position"] for c in col["cards"]]
        assert len(positions) == len(set(positions)), f"Collision in column {col['title']}: {positions}"


def test_ai_board_update_preserves_metadata():
    """Test that apply_board_update preserves priority, due_date, and labels for existing cards."""
    from app.db.board import apply_board_update, get_board_by_id
    from app.db.card import add_card

    # Add a card with full metadata
    add_card("col-backlog", "card-meta-test", "Metadata Card", "Details", "user", "high", "2025-12-31", "bug,urgent")

    # Verify the card has metadata
    board = get_board_by_id(get_first_board_id(), "user")
    col = next(c for c in board["columns"] if c["id"] == "col-backlog")
    card = next(c for c in col["cards"] if c["id"] == "card-meta-test")
    assert card["priority"] == "high"
    assert card["due_date"] == "2025-12-31"
    assert card["labels"] == "bug,urgent"

    # Apply a board update that only provides id/title/details/position
    update_data = {
        "columns": [
            {
                "id": "col-backlog",
                "title": "Backlog",
                "position": 0,
                "cards": [
                    {"id": "card-meta-test", "title": "Metadata Card", "details": "Details", "position": 0},
                ],
            },
            {"id": "col-discovery", "title": "Discovery", "position": 1, "cards": []},
            {"id": "col-progress", "title": "In Progress", "position": 2, "cards": []},
            {"id": "col-review", "title": "Review", "position": 3, "cards": []},
            {"id": "col-done", "title": "Done", "position": 4, "cards": []},
        ]
    }

    result = apply_board_update(update_data, "user")
    assert result["preserved_cards"] >= 1

    # Verify metadata was preserved
    board = get_board_by_id(get_first_board_id(), "user")
    col = next(c for c in board["columns"] if c["id"] == "col-backlog")
    card = next(c for c in col["cards"] if c["id"] == "card-meta-test")
    assert card["priority"] == "high"
    assert card["due_date"] == "2025-12-31"
    assert card["labels"] == "bug,urgent"


def test_server_side_card_id_generation():
    """Test that the server generates a card ID when none is provided."""
    response = client.post(
        "/api/boards/cards",
        json={"column_id": "col-backlog", "title": "Auto ID Card"},
        cookies=AUTH_COOKIES,
        headers=CSRF_HEADER,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"].startswith("card-")
    assert len(data["id"]) > len("card-") + 8  # Should be a full UUID


def test_client_provided_card_id_still_works():
    """Test that providing an ID still works (backward compatibility)."""
    response = client.post(
        "/api/boards/cards",
        json={"column_id": "col-backlog", "id": "card-custom-123", "title": "Custom ID Card"},
        cookies=AUTH_COOKIES,
        headers=CSRF_HEADER,
    )
    assert response.status_code == 200
    assert response.json()["id"] == "card-custom-123"


def test_jwt_secret_warning():
    """Test that the session module has a default secret constant for validation."""
    from app.session import _DEFAULT_SECRET
    assert _DEFAULT_SECRET == "change-me-in-production-use-32-bytes"
    assert len(_DEFAULT_SECRET) > 0
