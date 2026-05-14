from fastapi import APIRouter, Cookie, HTTPException, Query
from pydantic import BaseModel, field_validator
import uuid

from app.routes.deps import require_user
from app.db import get_boards_for_user, get_board_by_id, create_board, delete_board, update_board_title, rename_column, add_column, delete_column, add_card, update_card, delete_card, move_card, archive_board, unarchive_board, toggle_board_favorite, update_board_description
from app.db.board_settings import update_board_settings
from app.db.template import get_template_by_id

router = APIRouter()


class RenameColumnBody(BaseModel):
    title: str

    @field_validator("title")
    @classmethod
    def title_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Title is required")
        return v


class CreateColumnBody(BaseModel):
    board_id: str
    title: str

    @field_validator("title")
    @classmethod
    def title_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Title is required")
        return v.strip()


class CreateCardBody(BaseModel):
    column_id: str
    id: str = ""
    title: str
    details: str = ""
    priority: str = "none"
    due_date: str | None = None
    labels: str = ""
    story_points: int | None = None
    estimated_hours: float | None = None
    card_type: str = "task"

    @field_validator("priority")
    @classmethod
    def priority_valid(cls, v: str) -> str:
        if v not in ("none", "low", "medium", "high"):
            raise ValueError("Priority must be none, low, medium, or high")
        return v


class EditCardBody(BaseModel):
    title: str | None = None
    details: str | None = None
    priority: str | None = None
    due_date: str | None = None
    labels: str | None = None
    story_points: int | None = None
    estimated_hours: float | None = None
    card_type: str | None = None

    @field_validator("priority")
    @classmethod
    def priority_valid(cls, v: str | None) -> str | None:
        if v is not None and v not in ("none", "low", "medium", "high"):
            raise ValueError("Priority must be none, low, medium, or high")
        return v

    @field_validator("card_type")
    @classmethod
    def card_type_valid(cls, v: str | None) -> str | None:
        if v is not None and v not in ("task", "bug", "story", "epic"):
            raise ValueError("Card type must be task, bug, story, or epic")
        return v


class MoveCardBody(BaseModel):
    column_id: str
    position: int

    @field_validator("position")
    @classmethod
    def position_non_negative(cls, v: int) -> int:
        if v < 0:
            raise ValueError("Position must be non-negative")
        return v


class CreateBoardBody(BaseModel):
    title: str = "New Board"
    template_id: str | None = None
    description: str = ""

    @field_validator("title")
    @classmethod
    def title_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Title is required")
        return v.strip()


class UpdateBoardBody(BaseModel):
    title: str

    @field_validator("title")
    @classmethod
    def title_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Title is required")
        return v.strip()


class UpdateBoardDescriptionBody(BaseModel):
    description: str


class BoardSettingsBody(BaseModel):
    wip_limit: int | None = None
    default_card_type: str | None = None
    description: str | None = None


@router.get("/boards")
async def list_boards(session_token: str | None = Cookie(None), include_archived: bool = Query(False)):
    username = require_user(session_token)
    boards = get_boards_for_user(username, include_archived=include_archived)
    return {"boards": boards}


@router.post("/boards")
async def new_board(body: CreateBoardBody, session_token: str | None = Cookie(None)):
    username = require_user(session_token)
    column_names = None
    if body.template_id:
        template = get_template_by_id(body.template_id)
        if template:
            column_names = template["columns"]
            if body.title == "New Board":
                body.title = template["name"]
    board = create_board(username, body.title, column_names, description=body.description)
    return board


@router.get("/boards/{board_id}")
async def read_board(board_id: str, session_token: str | None = Cookie(None)):
    username = require_user(session_token)
    board = get_board_by_id(board_id, username)
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    return board


@router.put("/boards/{board_id}")
async def update_board(board_id: str, body: UpdateBoardBody, session_token: str | None = Cookie(None)):
    username = require_user(session_token)
    if not update_board_title(board_id, body.title, username):
        raise HTTPException(status_code=404, detail="Board not found")
    return {"detail": "Board renamed"}


@router.delete("/boards/{board_id}")
async def remove_board(board_id: str, session_token: str | None = Cookie(None)):
    username = require_user(session_token)
    if not delete_board(board_id, username):
        raise HTTPException(status_code=404, detail="Board not found")
    return {"detail": "Board deleted"}


@router.put("/boards/{board_id}/archive")
async def archive_board_endpoint(board_id: str, session_token: str | None = Cookie(None)):
    username = require_user(session_token)
    if not archive_board(board_id, username):
        raise HTTPException(status_code=404, detail="Board not found")
    return {"detail": "Board archived"}


@router.put("/boards/{board_id}/unarchive")
async def unarchive_board_endpoint(board_id: str, session_token: str | None = Cookie(None)):
    username = require_user(session_token)
    if not unarchive_board(board_id, username):
        raise HTTPException(status_code=404, detail="Board not found")
    return {"detail": "Board unarchived"}


@router.put("/boards/{board_id}/favorite")
async def toggle_favorite_endpoint(board_id: str, session_token: str | None = Cookie(None)):
    username = require_user(session_token)
    if not toggle_board_favorite(board_id, username):
        raise HTTPException(status_code=404, detail="Board not found")
    return {"detail": "Favorite toggled"}


@router.put("/boards/{board_id}/description")
async def update_description_endpoint(board_id: str, body: UpdateBoardDescriptionBody, session_token: str | None = Cookie(None)):
    username = require_user(session_token)
    if not update_board_description(board_id, body.description, username):
        raise HTTPException(status_code=404, detail="Board not found")
    return {"detail": "Description updated"}


@router.put("/boards/{board_id}/settings")
async def update_settings_endpoint(board_id: str, body: BoardSettingsBody, session_token: str | None = Cookie(None)):
    username = require_user(session_token)
    if not update_board_settings(board_id, username, wip_limit=body.wip_limit, default_card_type=body.default_card_type, description=body.description):
        raise HTTPException(status_code=404, detail="Board not found")
    return {"detail": "Settings updated"}


@router.post("/boards/columns")
async def create_column(body: CreateColumnBody, session_token: str | None = Cookie(None)):
    username = require_user(session_token)
    col = add_column(body.board_id, body.title, username)
    if not col:
        raise HTTPException(status_code=400, detail="Failed to add column")
    return col


@router.put("/boards/columns/{column_id}")
async def update_column(column_id: str, body: RenameColumnBody, session_token: str | None = Cookie(None)):
    username = require_user(session_token)
    if not rename_column(column_id, body.title, username):
        raise HTTPException(status_code=404, detail="Column not found")
    return {"detail": "Column renamed"}


@router.delete("/boards/columns/{column_id}")
async def remove_column(column_id: str, session_token: str | None = Cookie(None)):
    username = require_user(session_token)
    if not delete_column(column_id, username):
        raise HTTPException(status_code=404, detail="Column not found")
    return {"detail": "Column deleted"}


@router.post("/boards/cards")
async def create_card(body: CreateCardBody, session_token: str | None = Cookie(None)):
    username = require_user(session_token)
    card_id = body.id or f"card-{uuid.uuid4()}"
    if not add_card(body.column_id, card_id, body.title, body.details, username, body.priority, body.due_date, body.labels, body.story_points, body.estimated_hours, body.card_type):
        raise HTTPException(status_code=400, detail="Failed to add card")
    return {"detail": "Card added", "id": card_id}


@router.put("/boards/cards/{card_id}")
async def edit_card(card_id: str, body: EditCardBody, session_token: str | None = Cookie(None)):
    username = require_user(session_token)
    if not update_card(card_id, body.title, body.details, username, body.priority, body.due_date, body.labels, body.story_points, body.estimated_hours, body.card_type):
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
