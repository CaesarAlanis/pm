import tempfile
import unittest
from pathlib import Path
from unittest.mock import AsyncMock
from unittest.mock import patch

from fastapi.testclient import TestClient
import httpx

from backend import ai
from backend import db
from backend.main import app


class BackendPersistenceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tempdir = tempfile.TemporaryDirectory()
        db.DB_PATH = Path(self.tempdir.name) / "test.db"
        db.init_db()
        self.client = TestClient(app)

    def tearDown(self) -> None:
        self.tempdir.cleanup()

    def test_database_initializes_tables(self) -> None:
        self.assertTrue(db.DB_PATH.exists())
        with db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
            )
            self.assertIsNotNone(cursor.fetchone())
            cursor.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='boards'"
            )
            self.assertIsNotNone(cursor.fetchone())

    def test_health_endpoint(self) -> None:
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})

    def test_startup_creates_database_if_missing(self) -> None:
        self.tempdir.cleanup()
        self.tempdir = tempfile.TemporaryDirectory()
        db.DB_PATH = Path(self.tempdir.name) / "startup.db"
        self.assertFalse(db.DB_PATH.exists())

        with TestClient(app) as startup_client:
            response = startup_client.get("/api/health")
            self.assertEqual(response.status_code, 200)

        self.assertTrue(db.DB_PATH.exists())

    def test_get_board_returns_default_for_new_user(self) -> None:
        response = self.client.get("/api/board/user")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["user"], "user")
        self.assertEqual(response.json()["board"], db.DEFAULT_BOARD)

    def test_save_board_then_read_board(self) -> None:
        payload = {
            "board": {
                "cards": {
                    "card-1": {"id": "card-1", "title": "Task 1", "details": "Notes"}
                },
                "columns": [{"id": "col-1", "title": "Todo", "cardIds": ["card-1"]}],
            }
        }

        save_response = self.client.post("/api/board/user", json=payload)
        self.assertEqual(save_response.status_code, 200)
        self.assertEqual(save_response.json()["board"], payload["board"])

        read_response = self.client.get("/api/board/user")
        self.assertEqual(read_response.status_code, 200)
        self.assertEqual(read_response.json()["board"], payload["board"])

    def test_chat_endpoint_returns_model_response(self) -> None:
        with patch(
            "backend.main.ai.ask_openrouter",
            new=AsyncMock(
                return_value='{"message":"Done. Added card.","boardUpdate":{"cards":{"c1":{"id":"c1","title":"Task"}},"columns":[]}}'
            ),
        ):
            response = self.client.post(
                "/api/chat",
                json={"board": db.DEFAULT_BOARD, "conversation": [], "message": "Add a task"},
            )
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["message"], "Done. Added card.")
        self.assertIsInstance(body["boardUpdate"], dict)

    def test_chat_endpoint_returns_502_on_provider_error(self) -> None:
        with patch(
            "backend.main.ai.ask_openrouter",
            new=AsyncMock(side_effect=RuntimeError("provider unavailable")),
        ):
            response = self.client.post(
                "/api/chat",
                json={"board": db.DEFAULT_BOARD, "conversation": [], "message": "2+2"},
            )
        self.assertEqual(response.status_code, 502)
        self.assertIn("AI request failed", response.json()["detail"])

    def test_chat_endpoint_returns_502_on_invalid_message_field(self) -> None:
        with patch(
            "backend.main.ai.ask_openrouter",
            new=AsyncMock(return_value='{"message":null,"boardUpdate":null}'),
        ):
            response = self.client.post(
                "/api/chat",
                json={"board": db.DEFAULT_BOARD, "conversation": [], "message": "hello"},
            )
        self.assertEqual(response.status_code, 502)
        self.assertIn("invalid message field", response.json()["detail"])

    def test_chat_endpoint_ignores_non_object_board_update(self) -> None:
        with patch(
            "backend.main.ai.ask_openrouter",
            new=AsyncMock(return_value='{"message":"No board change","boardUpdate":"skip"}'),
        ):
            response = self.client.post(
                "/api/chat",
                json={"board": db.DEFAULT_BOARD, "conversation": [], "message": "hello"},
            )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["message"], "No board change")
        self.assertIsNone(response.json()["boardUpdate"])

    def test_chat_endpoint_ignores_malformed_board_update(self) -> None:
        with patch(
            "backend.main.ai.ask_openrouter",
            new=AsyncMock(
                return_value='{"message":"No board change","boardUpdate":{"columns":[{"id":"todo","title":"Todo","cardIds":["missing"]}],"cards":{}}}'
            ),
        ):
            response = self.client.post(
                "/api/chat",
                json={"board": db.DEFAULT_BOARD, "conversation": [], "message": "hello"},
            )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["message"], "No board change")
        self.assertIsNone(response.json()["boardUpdate"])


class OpenRouterConfigTests(unittest.IsolatedAsyncioTestCase):
    async def test_openrouter_key_must_use_openrouter_prefix(self) -> None:
        with patch.dict("os.environ", {"OPENROUTER_API_KEY": "not-an-openrouter-key"}):
            with self.assertRaisesRegex(RuntimeError, "starting with sk-or-"):
                await ai.ask_openrouter([{"role": "user", "content": "2+2"}])

    def test_payment_required_error_is_actionable(self) -> None:
        request = httpx.Request("POST", ai.OPENROUTER_URL)
        response = httpx.Response(402, request=request)
        error = httpx.HTTPStatusError("Payment Required", request=request, response=response)

        self.assertIn("Add credits", ai._provider_error_message(error))


if __name__ == "__main__":
    unittest.main()
