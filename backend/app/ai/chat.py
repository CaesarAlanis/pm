import json
import re

from app.ai.client import call_ai
from app.ai.prompt import SYSTEM_PROMPT

_conversations: dict[str, list[dict[str, str]]] = {}

MAX_HISTORY_PER_USER = 20
MAX_USERS = 1000


def get_history(username: str) -> list[dict[str, str]]:
    return _conversations.get(username, [])


def append_history(username: str, role: str, content: str) -> None:
    if username not in _conversations:
        if len(_conversations) >= MAX_USERS:
            oldest = next(iter(_conversations))
            del _conversations[oldest]
        _conversations[username] = []
    _conversations[username].append({"role": role, "content": content})
    if len(_conversations[username]) > MAX_HISTORY_PER_USER:
        _conversations[username] = _conversations[username][-MAX_HISTORY_PER_USER:]


def clear_history(username: str) -> None:
    _conversations.pop(username, None)


def _sanitize_message(text: str) -> str:
    """Strip HTML/script tags from AI response as defense-in-depth."""
    text = re.sub(r"<script[^>]*>.*?</script>", "", text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<[^>]+>", "", text)
    return text.strip()


def _parse_response(raw: str) -> dict:
    try:
        text = raw.strip()
        # Handle markdown code blocks
        if text.startswith("```"):
            lines = text.split("\n")
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
    parsed["message"] = _sanitize_message(parsed["message"])
    return parsed
