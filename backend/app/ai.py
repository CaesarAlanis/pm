import os
import json

import httpx

OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
MODEL = os.environ.get("AI_MODEL", "z-ai/glm-4.5-air:free")

SYSTEM_PROMPT = """You are a helpful project management assistant. You can see the user's Kanban board and can help manage it.

When the user asks you to modify the board (add/remove/move cards, rename columns), respond with a JSON object that has:
- "message": your response to the user
- "board_update": the updated board state with the same structure as the input board, or null if no changes needed

The board structure is:
{
  "columns": [
    {
      "id": "col-xxx",
      "title": "Column Title",
      "position": 0,
      "cards": [
        {"id": "card-xxx", "title": "Card Title", "details": "Card details", "position": 0}
      ]
    }
  ]
}

IMPORTANT RULES:
- Only modify the board when the user explicitly asks you to
- When adding a new card, generate an id starting with "card-" followed by a short random string
- When moving cards, update their position values and column assignments accordingly
- Preserve all existing cards and columns unless asked to delete them
- Always respond with valid JSON containing both "message" and "board_update" fields
- If no board changes are needed, set "board_update" to null"""

_conversations: dict[str, list[dict[str, str]]] = {}


def get_history(username: str) -> list[dict[str, str]]:
    return _conversations.get(username, [])


def append_history(username: str, role: str, content: str) -> None:
    if username not in _conversations:
        _conversations[username] = []
    _conversations[username].append({"role": role, "content": content})
    # Keep last 20 messages to avoid context overflow
    if len(_conversations[username]) > 20:
        _conversations[username] = _conversations[username][-20:]


def clear_history(username: str) -> None:
    _conversations.pop(username, None)


async def call_ai(messages: list[dict[str, str]]) -> str:
    if not OPENROUTER_API_KEY:
        raise ValueError("OPENROUTER_API_KEY is not set")

    async with httpx.AsyncClient() as client:
        response = await client.post(
            OPENROUTER_URL,
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": MODEL,
                "messages": messages,
            },
            timeout=30.0,
        )
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]


async def chat_with_board(username: str, user_message: str, board_json: str) -> dict:
    history = get_history(username)
    board_context = f"Current board state:\n{board_json}"

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    if board_context:
        messages.append({"role": "system", "content": board_context})
    messages.extend(history)
    messages.append({"role": "user", "content": user_message})

    raw_response = await call_ai(messages)

    append_history(username, "user", user_message)
    append_history(username, "assistant", raw_response)

    parsed = _parse_response(raw_response)
    return parsed


def _parse_response(raw: str) -> dict:
    try:
        # Try to extract JSON from the response
        text = raw.strip()
        # Handle markdown code blocks
        if text.startswith("```"):
            lines = text.split("\n")
            # Remove first and last lines (``` markers)
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            text = "\n".join(lines)

        data = json.loads(text)
        message = data.get("message", raw)
        board_update = data.get("board_update")
        return {"message": message, "board_update": board_update}
    except (json.JSONDecodeError, AttributeError):
        return {"message": raw, "board_update": None}
