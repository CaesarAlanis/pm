from fastapi.testclient import TestClient
from backend.main import app
from backend.ai_service import generate_simple_prompt, generate_kanban_reasoning

client = TestClient(app)

def test_generate_simple_prompt():
    response = generate_simple_prompt("Say hello")
    assert isinstance(response, str)
    assert len(response) > 0

def test_ai_endpoint():
    response = client.get("/api/ai/test?prompt=2%2B2")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["model"] == "gemini-2.5-flash"
    assert "response" in data

def test_generate_kanban_reasoning():
    board_state = {
        "columns": [{"id": "col-backlog", "title": "Backlog", "cardIds": []}],
        "cards": {}
    }
    result = generate_kanban_reasoning("Crea una tarea llamada Tarea Inicial", board_state)
    assert result.response_text is not None
    assert result.action is not None

def test_ai_chat_endpoint():
    payload = {
        "message": "Agrega una nueva tarjeta titulada 'Investigar arquitectura'",
        "chat_history": []
    }
    response = client.post("/api/ai/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "response_text" in data
    assert "board" in data
