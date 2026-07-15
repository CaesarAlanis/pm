import unittest

from fastapi.testclient import TestClient

from backend.app import app


class ChatEndpointTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app)

    def test_health_endpoint(self) -> None:
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "ok")

    def test_chat_endpoint_returns_reply(self) -> None:
        response = self.client.post(
            "/api/chat",
            json={
                "message": "Add a card for review",
                "board": {"columns": [], "cards": {}},
            },
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("reply", response.json())


if __name__ == "__main__":
    unittest.main()
