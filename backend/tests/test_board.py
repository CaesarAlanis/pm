import importlib
import os

from fastapi.testclient import TestClient


def build_client(tmp_path):
    db_path = tmp_path / "kanban.db"
    os.environ["DB_PATH"] = str(db_path)
    app_module = importlib.import_module("app.main")
    importlib.reload(app_module)
    app_module.init_db()
    return TestClient(app_module.app)


def test_get_board_seeds_defaults(tmp_path):
    client = build_client(tmp_path)
    response = client.get("/api/board")
    assert response.status_code == 200
    payload = response.json()
    assert len(payload["columns"]) == 5
    assert "card-1" in payload["cards"]
    assert payload["columns"][0]["title"] == "Backlog"


def test_update_board_persists(tmp_path):
    client = build_client(tmp_path)
    board = {
        "columns": [
            {"id": "col-1", "title": "Todo", "cardIds": ["card-1"]},
            {"id": "col-2", "title": "Done", "cardIds": []},
        ],
        "cards": {"card-1": {"id": "card-1", "title": "Test", "details": "Note"}},
    }
    response = client.put("/api/board", json=board)
    assert response.status_code == 200
    payload = response.json()
    assert payload["columns"][0]["title"] == "Todo"
    assert payload["cards"]["card-1"]["title"] == "Test"
