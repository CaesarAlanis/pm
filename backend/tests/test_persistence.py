from fastapi.testclient import TestClient

from backend.database import ensure_seed_data, init_db
from backend.main import app


client = TestClient(app)


def setup_function() -> None:
    init_db()
    ensure_seed_data()


def test_get_board_returns_seed_data() -> None:
    response = client.get("/api/board/user")

    assert response.status_code == 200
    payload = response.json()
    assert payload["columns"]
    assert payload["cards"]


def test_put_board_persists_updates() -> None:
    payload = {
        "columns": [
            {"id": "col-1", "title": "Backlog", "cardIds": ["card-1"]},
            {"id": "col-2", "title": "Done", "cardIds": []},
        ],
        "cards": {
            "card-1": {"id": "card-1", "title": "Updated card", "details": "New details"}
        },
    }

    response = client.put("/api/board/user", json=payload)

    assert response.status_code == 200
    saved = response.json()
    assert saved["columns"][0]["title"] == "Backlog"
    assert saved["cards"]["card-1"]["title"] == "Updated card"

    follow_up = client.get("/api/board/user")
    assert follow_up.json()["cards"]["card-1"]["title"] == "Updated card"
