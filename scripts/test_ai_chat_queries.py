import json
from backend.ai_service import generate_kanban_reasoning

test_board = {
    "columns": [
        {"id": "col-backlog", "title": "Backlog", "cardIds": ["card-1"]},
        {"id": "col-discovery", "title": "Discovery", "cardIds": []},
        {"id": "col-progress", "title": "In Progress", "cardIds": []},
        {"id": "col-review", "title": "Review", "cardIds": []},
        {"id": "col-done", "title": "Done", "cardIds": []},
    ],
    "cards": {
        "card-1": {"id": "card-1", "title": "Align roadmap themes", "details": "Draft quarterly themes."}
    }
}

queries = [
    "Hola, ¿quién eres y qué puedes hacer?",
    "¿Qué tareas tenemos en el tablero?",
    "Crea una tarjeta llamada 'Módulo de Facturación' en Backlog",
    "Mueve la tarjeta 'Align roadmap themes' a In Progress"
]

print("=== TESTING AI CHAT QUERIES WITH LIVE GEMINI API ===")

for q in queries:
    print(f"\nUser Query: {q}")
    res = generate_kanban_reasoning(user_message=q, board_state=test_board)
    print("AI Response Text:", res.response_text)
    print("AI Action:", res.action)
