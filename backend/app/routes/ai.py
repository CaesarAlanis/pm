import json
import re
import logging

from fastapi import APIRouter, Cookie, HTTPException, Request
from pydantic import BaseModel, field_validator

from app.routes.deps import require_user, limiter, logger
from app.db import get_board, apply_board_update
from app.ai import call_ai, chat_with_board

router = APIRouter()


class ChatBody(BaseModel):
    message: str

    @field_validator("message")
    @classmethod
    def message_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("message is required")
        return v


class BoardUpdateColumn(BaseModel):
    id: str
    title: str
    position: int = 0
    cards: list[dict] = []

    @field_validator("id")
    @classmethod
    def column_id_format(cls, v: str) -> str:
        if not re.match(r"^col-[a-z0-9-]+$", v):
            raise ValueError("Invalid column ID format")
        return v


class BoardUpdate(BaseModel):
    columns: list[BoardUpdateColumn]


@router.post("/ai/test")
@limiter.limit("10/minute")
async def test_ai(request: Request, session_token: str | None = Cookie(None)):
    require_user(session_token)
    try:
        result = await call_ai([{"role": "user", "content": "What is 2+2? Reply with just the number."}])
        return {"response": result}
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error("AI test call failed: %s", e)
        raise HTTPException(status_code=502, detail="AI service unavailable")


@router.post("/ai/chat")
@limiter.limit("20/minute")
async def chat(request: Request, body: ChatBody, session_token: str | None = Cookie(None)):
    username = require_user(session_token)
    board = get_board(username)
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")

    board_json = json.dumps(board)

    try:
        result = await chat_with_board(username, body.message, board_json)
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error("AI chat call failed: %s", e)
        raise HTTPException(status_code=502, detail="AI service unavailable")

    board_updated = False
    if result.get("board_update"):
        try:
            validated = BoardUpdate.model_validate(result["board_update"])
            apply_board_update(validated.model_dump(), username)
            board_updated = True
        except Exception as e:
            logger.error("Invalid board update from AI: %s", e)

    return {"message": result["message"], "board_updated": board_updated}
