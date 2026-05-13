from fastapi import APIRouter, Cookie, HTTPException
from pydantic import BaseModel, field_validator

from app.routes.deps import require_user
from app.db import get_board, rename_column, add_card, update_card, delete_card, move_card

router = APIRouter()


class RenameColumnBody(BaseModel):
    title: str

    @field_validator("title")
    @classmethod
    def title_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Title is required")
        return v


class CreateCardBody(BaseModel):
    column_id: str
    id: str
    title: str
    details: str = ""


class EditCardBody(BaseModel):
    title: str | None = None
    details: str | None = None


class MoveCardBody(BaseModel):
    column_id: str
    position: int

    @field_validator("position")
    @classmethod
    def position_non_negative(cls, v: int) -> int:
        if v < 0:
            raise ValueError("Position must be non-negative")
        return v


@router.get("/boards")
async def read_board(session_token: str | None = Cookie(None)):
    username = require_user(session_token)
    board = get_board(username)
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    return board


@router.put("/boards/columns/{column_id}")
async def update_column(column_id: str, body: RenameColumnBody, session_token: str | None = Cookie(None)):
    username = require_user(session_token)
    if not rename_column(column_id, body.title, username):
        raise HTTPException(status_code=404, detail="Column not found")
    return {"detail": "Column renamed"}


@router.post("/boards/cards")
async def create_card(body: CreateCardBody, session_token: str | None = Cookie(None)):
    username = require_user(session_token)
    if not add_card(body.column_id, body.id, body.title, body.details, username):
        raise HTTPException(status_code=400, detail="Failed to add card")
    return {"detail": "Card added", "id": body.id}


@router.put("/boards/cards/{card_id}")
async def edit_card(card_id: str, body: EditCardBody, session_token: str | None = Cookie(None)):
    username = require_user(session_token)
    if not update_card(card_id, body.title, body.details, username):
        raise HTTPException(status_code=404, detail="Card not found")
    return {"detail": "Card updated"}


@router.delete("/boards/cards/{card_id}")
async def remove_card(card_id: str, session_token: str | None = Cookie(None)):
    username = require_user(session_token)
    if not delete_card(card_id, username):
        raise HTTPException(status_code=404, detail="Card not found")
    return {"detail": "Card deleted"}


@router.put("/boards/cards/{card_id}/move")
async def reorder_card(card_id: str, body: MoveCardBody, session_token: str | None = Cookie(None)):
    username = require_user(session_token)
    if not move_card(card_id, body.column_id, body.position, username):
        raise HTTPException(status_code=404, detail="Card not found")
    return {"detail": "Card moved"}
