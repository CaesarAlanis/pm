import os

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.mark.skipif(
    not os.environ.get("OPENROUTER_API_KEY"),
    reason="OPENROUTER_API_KEY not set",
)
def test_ai_connectivity():
    client = TestClient(app)
    response = client.post("/api/ai/test")
    assert response.status_code == 200
    assert response.json()["result"] == "4"
