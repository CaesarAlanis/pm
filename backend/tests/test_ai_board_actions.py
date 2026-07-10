from unittest.mock import patch

from fastapi.testclient import TestClient

from backend.database import ensure_seed_data, init_db
from backend.main import app

client = TestClient(app)


def setup_function() -> None:
    init_db()
    ensure_seed_data()


def test_ai_board_action_applies_valid_update() -> None:
    with patch.dict("os.environ", {"OPENROUTER_API_KEY": "test-key"}), patch("httpx.post") as mocked_post:
        mocked_post.return_value.raise_for_status.return_value = None
        mocked_post.return_value.json.return_value = {
            "choices": [
                {
                    "message": {
                        "content": '{"reply": "Updated the card title", "board_update": {"columns": [{"id": "col-1", "title": "Backlog", "cardIds": ["card-1"]}], "cards": {"card-1": {"id": "card-1", "title": "AI updated card", "details": "Updated by AI"}}}}'
                    }
                }
            ]
        }

        response = client.post(
            "/api/ai/board-action",
            json={"username": "user", "question": "Rename the first card"},
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["applied"] is True
    assert payload["reply"] == "Updated the card title"
    assert payload["board"]["cards"]["card-1"]["title"] == "AI updated card"


def test_ai_board_action_rejects_invalid_update() -> None:
    with patch.dict("os.environ", {"OPENROUTER_API_KEY": "test-key"}), patch("httpx.post") as mocked_post:
        mocked_post.return_value.raise_for_status.return_value = None
        mocked_post.return_value.json.return_value = {
            "choices": [
                {
                    "message": {
                        "content": '{"reply": "I could not update the board", "board_update": {"foo": "bar"}}'
                    }
                }
            ]
        }

        response = client.post(
            "/api/ai/board-action",
            json={"username": "user", "question": "Do something invalid"},
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["applied"] is False
    assert payload["reply"] == "I could not update the board"
