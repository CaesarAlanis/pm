import json
import os
from pathlib import Path
from typing import Any

import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from starlette.responses import FileResponse

from backend.database import get_board_state, replace_board_state

app = FastAPI(title="Project Management MVP Backend", version="0.1.0")

APP_ROOT = Path(__file__).resolve().parent.parent
FRONTEND_BUILD_DIR = APP_ROOT / "frontend" / "out"


class BoardPayload(BaseModel):
    columns: list[dict[str, object]]
    cards: dict[str, dict[str, str]]


class AIConnectivityResponse(BaseModel):
    ok: bool
    message: str
    model: str | None = None
    provider: str | None = None


class AIBoardActionRequest(BaseModel):
    username: str
    question: str
    history: list[dict[str, str]] | None = None


class AIBoardActionResponse(BaseModel):
    reply: str
    applied: bool
    board: dict[str, Any] | None = None


class AIBoardUpdatePayload(BaseModel):
    reply: str
    board_update: BoardPayload | None = None


@app.get("/", include_in_schema=False)
async def read_root() -> FileResponse:
    return FileResponse(FRONTEND_BUILD_DIR / "index.html")


@app.get("/api/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok", "service": "pm-backend"}


@app.get("/api/demo")
async def demo_route() -> dict[str, str]:
    return {"message": "Hello from the API", "app": "Project Management MVP"}


@app.get("/api/board/{username}")
async def get_board(username: str) -> dict[str, object]:
    try:
        return get_board_state(username)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.put("/api/board/{username}")
async def update_board(username: str, payload: BoardPayload) -> dict[str, object]:
    try:
        return replace_board_state(username, payload.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/api/ai/connectivity")
async def ai_connectivity() -> AIConnectivityResponse:
    api_key = os.getenv("OPENROUTER_API_KEY")
    model = os.getenv("OPENROUTER_MODEL", "openai/gpt-oss-120b")

    if not api_key:
        return AIConnectivityResponse(
            ok=False,
            message="OPENROUTER_API_KEY is not configured.",
            model=model,
            provider="openrouter",
        )

    try:
        response = httpx.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "messages": [{"role": "user", "content": "Say OK in one word."}],
            },
            timeout=20.0,
        )
        response.raise_for_status()
        payload = response.json()
        content = payload.get("choices", [{}])[0].get("message", {}).get("content", "")
        return AIConnectivityResponse(
            ok=True,
            message=content.strip() or "Connected",
            model=model,
            provider="openrouter",
        )
    except Exception as exc:
        return AIConnectivityResponse(
            ok=False,
            message=f"OpenRouter request failed: {exc}",
            model=model,
            provider="openrouter",
        )


@app.post("/api/ai/board-action", response_model=AIBoardActionResponse)
async def ai_board_action(request: AIBoardActionRequest) -> AIBoardActionResponse:
    api_key = os.getenv("OPENROUTER_API_KEY")
    model = os.getenv("OPENROUTER_MODEL", "openai/gpt-oss-120b")

    if not api_key:
        return AIBoardActionResponse(reply="OpenRouter is not configured.", applied=False)

    try:
        board = get_board_state(request.username)
    except ValueError:
        raise HTTPException(status_code=404, detail="User not found") from None

    history_text = ""
    if request.history:
        history_text = "\n".join(
            f"{item.get('role', 'user')}: {item.get('content', '')}" for item in request.history
        )

    prompt = f"""
You are helping manage a Kanban board.
Board JSON:
{json.dumps(board, indent=2)}

Conversation history:
{history_text}

User request:
{request.question}

Reply in JSON with this exact shape:
{{"reply": "short conversational response", "board_update": {{"columns": [...], "cards": {{...}}}}}}
If no board change is needed, set board_update to null.
""".strip()

    try:
        response = httpx.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "messages": [{"role": "user", "content": prompt}],
            },
            timeout=20.0,
        )
        response.raise_for_status()
        payload = response.json()
        message_content = (
            payload.get("choices", [{}])[0].get("message", {}).get("content", "")
        )
        parsed = json.loads(message_content)
        reply = parsed.get("reply", "I could not process that request.")
        if not isinstance(parsed, dict):
            return AIBoardActionResponse(reply=reply, applied=False)

        try:
            ai_payload = AIBoardUpdatePayload.model_validate(parsed)
        except Exception:
            return AIBoardActionResponse(reply=reply, applied=False)
    except Exception:
        return AIBoardActionResponse(reply="I could not process that request.", applied=False)

    if not ai_payload.board_update:
        return AIBoardActionResponse(reply=ai_payload.reply, applied=False)

    try:
        updated_board = replace_board_state(request.username, ai_payload.board_update)
    except ValueError as exc:
        return AIBoardActionResponse(reply=f"I could not apply the update: {exc}", applied=False)

    return AIBoardActionResponse(reply=ai_payload.reply, applied=True, board=updated_board)


@app.get("/{full_path:path}", include_in_schema=False)
async def serve_frontend(full_path: str) -> FileResponse:
    candidate_paths = [
        FRONTEND_BUILD_DIR / full_path,
        FRONTEND_BUILD_DIR / f"{full_path}.html",
        FRONTEND_BUILD_DIR / full_path / "index.html",
    ]

    for candidate in candidate_paths:
        if candidate.exists():
            return FileResponse(candidate)

    return FileResponse(FRONTEND_BUILD_DIR / "index.html")
