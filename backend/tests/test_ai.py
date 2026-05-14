import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)

AUTH_COOKIES = {}

CSRF_HEADER = {"X-Requested-With": "fetch"}


def login():
    import os
    import tempfile
    from app.db import connection
    os.environ.setdefault("DB_PATH", tempfile.mktemp(suffix=".db"))
    connection.DB_PATH = os.environ["DB_PATH"]
    from app.db import ensure_db
    ensure_db()
    resp = client.post("/api/auth/login", json={"username": "user", "password": "password"}, headers=CSRF_HEADER)
    AUTH_COOKIES["session_token"] = resp.cookies["session_token"]


login()


@pytest.mark.asyncio
async def test_call_ai_constructs_correct_request():
    from app.ai.client import call_ai
    with patch("app.ai.client.OPENROUTER_API_KEY", "test-key"):
        with patch("app.ai.client.MODEL", "z-ai/glm-5.1"):
            with patch("app.ai.client.httpx.AsyncClient") as mock_cls:
                mock_resp = AsyncMock()
                mock_resp.raise_for_status = lambda: None
                mock_resp.json = lambda: {"choices": [{"message": {"content": "4"}}]}

                mock_client = AsyncMock()
                mock_client.post = AsyncMock(return_value=mock_resp)
                mock_client.__aenter__ = AsyncMock(return_value=mock_client)
                mock_client.__aexit__ = AsyncMock(return_value=False)
                mock_cls.return_value = mock_client

                result = await call_ai([{"role": "user", "content": "What is 2+2?"}])
                assert result == "4"
                mock_client.post.assert_called_once()
                call_kwargs = mock_client.post.call_args[1]
                assert call_kwargs["json"]["model"] == "z-ai/glm-5.1"
                assert call_kwargs["json"]["messages"] == [{"role": "user", "content": "What is 2+2?"}]
                assert "Bearer test-key" in call_kwargs["headers"]["Authorization"]


@pytest.mark.asyncio
async def test_call_ai_missing_key():
    from app.ai.client import call_ai
    with patch("app.ai.client.OPENROUTER_API_KEY", ""):
        with pytest.raises(ValueError, match="OPENROUTER_API_KEY is not set"):
            await call_ai([{"role": "user", "content": "test"}])


def test_ai_test_endpoint():
    with patch("app.routes.ai.call_ai", new_callable=AsyncMock, return_value="4"):
        response = client.post("/api/ai/test", cookies=AUTH_COOKIES, headers=CSRF_HEADER)
        assert response.status_code == 200
        assert response.json()["response"] == "4"


def test_ai_test_endpoint_no_auth():
    fresh = TestClient(app)
    response = fresh.post("/api/ai/test", headers=CSRF_HEADER)
    assert response.status_code == 401


def test_ai_test_endpoint_no_api_key():
    with patch("app.routes.ai.call_ai", new_callable=AsyncMock, side_effect=ValueError("OPENROUTER_API_KEY is not set")):
        response = client.post("/api/ai/test", cookies=AUTH_COOKIES, headers=CSRF_HEADER)
        assert response.status_code == 500
