import os
from unittest.mock import patch

from fastapi.testclient import TestClient

from backend.main import app

client = TestClient(app)


def test_ai_connectivity_reports_missing_key() -> None:
    with patch.dict(os.environ, {"OPENROUTER_API_KEY": ""}, clear=False):
        response = client.get("/api/ai/connectivity")

    assert response.status_code == 200
    payload = response.json()
    assert payload["ok"] is False
    assert "OPENROUTER_API_KEY" in payload["message"]


def test_ai_connectivity_reports_success() -> None:
    with patch.dict(os.environ, {"OPENROUTER_API_KEY": "demo-key"}, clear=False):
        with patch("httpx.post") as mocked_post:
            mocked_post.return_value.raise_for_status.return_value = None
            mocked_post.return_value.json.return_value = {
                "choices": [{"message": {"content": "OK"}}]
            }

            response = client.get("/api/ai/connectivity")

    assert response.status_code == 200
    payload = response.json()
    assert payload["ok"] is True
    assert payload["message"] == "OK"
