import json

from fastapi import APIRouter, Cookie, HTTPException, Response

from app.session import create_session, delete_session, get_user, CREDENTIALS
from app.db import get_board, rename_column, add_card, update_card, delete_card, move_card, ensure_db, apply_board_update
from app.ai import call_ai, chat_with_board

router = APIRouter()


def require_user(session_token: str | None = Cookie(None)) -> str:
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    username = get_user(session_token)
    if not username:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return username


# --- Auth ---


@router.get("/hello")
async def hello():
    return {"message": "Hello from the PM app!"}


@router.get("/health")
async def health():
    return {"status": "ok"}


@router.post("/auth/login")
async def login(response: Response, body: dict):
    username = body.get("username", "")
    password = body.get("password", "")
    if CREDENTIALS.get(username) != password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_session(username)
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        samesite="lax",
    )
    ensure_db()
    return {"username": username}


@router.post("/auth/logout")
async def logout(response: Response, session_token: str | None = Cookie(None)):
    if session_token:
        delete_session(session_token)
    response.delete_cookie(key="session_token")
    return {"detail": "Logged out"}


@router.get("/auth/me")
async def me(session_token: str | None = Cookie(None)):
    username = require_user(session_token)
    return {"username": username}


# --- Board ---


@router.get("/boards")
async def read_board(session_token: str | None = Cookie(None)):
    username = require_user(session_token)
    board = get_board(username)
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    return board


@router.put("/boards/columns/{column_id}")
async def update_column(column_id: str, body: dict, session_token: str | None = Cookie(None)):
    require_user(session_token)
    title = body.get("title")
    if not title:
        raise HTTPException(status_code=400, detail="Title is required")
    if not rename_column(column_id, title):
        raise HTTPException(status_code=404, detail="Column not found")
    return {"detail": "Column renamed"}


@router.post("/boards/cards")
async def create_card(body: dict, session_token: str | None = Cookie(None)):
    require_user(session_token)
    column_id = body.get("column_id")
    card_id = body.get("id")
    title = body.get("title")
    details = body.get("details", "")
    if not column_id or not card_id or not title:
        raise HTTPException(status_code=400, detail="column_id, id, and title are required")
    if not add_card(column_id, card_id, title, details):
        raise HTTPException(status_code=400, detail="Failed to add card")
    return {"detail": "Card added"}


@router.put("/boards/cards/{card_id}")
async def edit_card(card_id: str, body: dict, session_token: str | None = Cookie(None)):
    require_user(session_token)
    title = body.get("title")
    details = body.get("details")
    if not update_card(card_id, title, details):
        raise HTTPException(status_code=404, detail="Card not found")
    return {"detail": "Card updated"}


@router.delete("/boards/cards/{card_id}")
async def remove_card(card_id: str, session_token: str | None = Cookie(None)):
    require_user(session_token)
    if not delete_card(card_id):
        raise HTTPException(status_code=404, detail="Card not found")
    return {"detail": "Card deleted"}


@router.put("/boards/cards/{card_id}/move")
async def reorder_card(card_id: str, body: dict, session_token: str | None = Cookie(None)):
    require_user(session_token)
    target_column_id = body.get("column_id")
    target_position = body.get("position")
    if target_column_id is None or target_position is None:
        raise HTTPException(status_code=400, detail="column_id and position are required")
    if not move_card(card_id, target_column_id, target_position):
        raise HTTPException(status_code=404, detail="Card not found")
    return {"detail": "Card moved"}


# --- AI ---


@router.post("/ai/test")
async def test_ai(session_token: str | None = Cookie(None)):
    require_user(session_token)
    try:
        result = await call_ai([{"role": "user", "content": "What is 2+2? Reply with just the number."}])
        return {"response": result}
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI call failed: {e}")


@router.post("/ai/chat")
async def chat(body: dict, session_token: str | None = Cookie(None)):
    username = require_user(session_token)
    message = body.get("message", "")
    if not message:
        raise HTTPException(status_code=400, detail="message is required")

    board = get_board(username)
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")

    board_json = json.dumps(board)

    try:
        result = await chat_with_board(username, message, board_json)
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI call failed: {e}")

    board_updated = False
    if result.get("board_update"):
        apply_board_update(result["board_update"])
        board_updated = True

    return {"message": result["message"], "board_updated": board_updated}
