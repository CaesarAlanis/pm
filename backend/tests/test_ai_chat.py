import json
import os
import tempfile
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from main import app
from app import db

tmp = tempfile.mktemp(suffix=".db")
os.environ["DB_PATH"] = tmp
db.DB_PATH = tmp
db.ensure_db()

client = TestClient(app)

AUTH_COOKIES = {}


def login():
    resp = client.post("/api/auth/login", json={"username": "user", "password": "password"})
    AUTH_COOKIES["session_token"] = resp.cookies["session_token"]


login()


# --- _parse_response tests ---


def test_parse_response_valid_json():
    from app.ai import _parse_response
    raw = json.dumps({"message": "Done!", "board_update": {"columns": []}})
    result = _parse_response(raw)
    assert result["message"] == "Done!"
    assert result["board_update"] == {"columns": []}


def test_parse_response_null_board_update():
    from app.ai import _parse_response
    raw = json.dumps({"message": "No changes needed", "board_update": None})
    result = _parse_response(raw)
    assert result["message"] == "No changes needed"
    assert result["board_update"] is None


def test_parse_response_invalid_json():
    from app.ai import _parse_response
    result = _parse_response("I don't know how to do that")
    assert result["message"] == "I don't know how to do that"
    assert result["board_update"] is None


def test_parse_response_markdown_code_block():
    from app.ai import _parse_response
    raw = '```json\n{"message": "Hi", "board_update": null}\n```'
    result = _parse_response(raw)
    assert result["message"] == "Hi"
    assert result["board_update"] is None


def test_parse_response_missing_message_field():
    from app.ai import _parse_response
    raw = json.dumps({"board_update": None})
    result = _parse_response(raw)
    assert result["message"] == raw  # Falls back to raw text
    assert result["board_update"] is None


# --- Conversation history tests ---


def test_conversation_history():
    from app.ai import append_history, get_history, clear_history
    clear_history("testuser")
    assert get_history("testuser") == []

    append_history("testuser", "user", "Hello")
    append_history("testuser", "assistant", "Hi there")
    history = get_history("testuser")
    assert len(history) == 2
    assert history[0] == {"role": "user", "content": "Hello"}
    assert history[1] == {"role": "assistant", "content": "Hi there"}

    clear_history("testuser")
    assert get_history("testuser") == []


def test_conversation_history_truncation():
    from app.ai import append_history, get_history, clear_history
    clear_history("testuser2")
    for i in range(25):
        append_history("testuser2", "user", f"msg {i}")
    history = get_history("testuser2")
    assert len(history) == 20
    assert history[0]["content"] == "msg 5"
    clear_history("testuser2")


# --- apply_board_update tests ---


def test_apply_board_update():
    from app.db import get_board, apply_board_update
    board = get_board("user")
    assert board is not None

    # Modify: rename first column and add a card
    update = {
        "columns": [
            {"id": "col-backlog", "title": "Todo", "position": 0, "cards": [
                {"id": "card-1", "title": "Task 1", "details": "Do it", "position": 0},
                {"id": "card-new", "title": "New task", "details": "Added by AI", "position": 1},
            ]},
            {"id": "col-discovery", "title": "Discovery", "position": 1, "cards": []},
            {"id": "col-progress", "title": "In Progress", "position": 2, "cards": []},
            {"id": "col-review", "title": "Review", "position": 3, "cards": []},
            {"id": "col-done", "title": "Done", "position": 4, "cards": []},
        ]
    }
    apply_board_update(update)

    updated = get_board("user")
    assert updated["columns"][0]["title"] == "Todo"
    assert len(updated["columns"][0]["cards"]) == 2
    assert updated["columns"][0]["cards"][1]["title"] == "New task"


# --- Chat endpoint tests ---


def test_chat_endpoint_no_update():
    with patch("app.ai.call_ai", new_callable=AsyncMock, return_value=json.dumps({
        "message": "Your board looks good!",
        "board_update": None,
    })):
        response = client.post(
            "/api/ai/chat",
            json={"message": "How does my board look?"},
            cookies=AUTH_COOKIES,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Your board looks good!"
        assert data["board_updated"] is False


def test_chat_endpoint_with_update():
    from app.ai import clear_history
    clear_history("user")

    board_update = {
        "columns": [
            {"id": "col-backlog", "title": "Backlog", "position": 0, "cards": [
                {"id": "card-1", "title": "Task", "details": "Details", "position": 0},
            ]},
            {"id": "col-discovery", "title": "Discovery", "position": 1, "cards": []},
            {"id": "col-progress", "title": "In Progress", "position": 2, "cards": []},
            {"id": "col-review", "title": "Review", "position": 3, "cards": []},
            {"id": "col-done", "title": "Done", "position": 4, "cards": []},
        ]
    }
    with patch("app.ai.call_ai", new_callable=AsyncMock, return_value=json.dumps({
        "message": "I added a card for you",
        "board_update": board_update,
    })):
        response = client.post(
            "/api/ai/chat",
            json={"message": "Add a card called Task"},
            cookies=AUTH_COOKIES,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["board_updated"] is True


def test_chat_endpoint_missing_message():
    response = client.post("/api/ai/chat", json={}, cookies=AUTH_COOKIES)
    assert response.status_code == 400


def test_chat_endpoint_no_auth():
    fresh = TestClient(app)
    response = fresh.post("/api/ai/chat", json={"message": "hello"})
    assert response.status_code == 401


def test_chat_endpoint_ai_failure():
    from app.ai import clear_history
    clear_history("user")
    with patch("app.ai.call_ai", new_callable=AsyncMock, side_effect=Exception("API error")):
        response = client.post(
            "/api/ai/chat",
            json={"message": "Hello"},
            cookies=AUTH_COOKIES,
        )
        assert response.status_code == 502
