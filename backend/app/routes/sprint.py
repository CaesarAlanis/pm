from fastapi import APIRouter, Cookie, HTTPException
from pydantic import BaseModel, field_validator

from app.routes.deps import require_user
from app.db.sprint import create_sprint, get_sprints, get_sprint, update_sprint, assign_card_to_sprint, remove_card_from_sprint

router = APIRouter()


class CreateSprintBody(BaseModel):
    name: str
    goal: str = ""
    start_date: str | None = None
    end_date: str | None = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Name is required")
        return v.strip()


class UpdateSprintBody(BaseModel):
    name: str | None = None
    goal: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    status: str | None = None

    @field_validator("status")
    @classmethod
    def status_valid(cls, v: str | None) -> str | None:
        if v is not None and v not in ("planning", "active", "completed"):
            raise ValueError("Status must be planning, active, or completed")
        return v


class AssignSprintBody(BaseModel):
    sprint_id: str


@router.post("/boards/{board_id}/sprints")
async def new_sprint(board_id: str, body: CreateSprintBody, session_token: str | None = Cookie(None)):
    username = require_user(session_token)
    sprint = create_sprint(board_id, body.name, body.goal, body.start_date, body.end_date, username)
    if not sprint:
        raise HTTPException(status_code=400, detail="Failed to create sprint")
    return sprint


@router.get("/boards/{board_id}/sprints")
async def list_sprints(board_id: str, session_token: str | None = Cookie(None)):
    username = require_user(session_token)
    return {"sprints": get_sprints(board_id, username)}


@router.get("/sprints/{sprint_id}")
async def read_sprint(sprint_id: str, session_token: str | None = Cookie(None)):
    username = require_user(session_token)
    sprint = get_sprint(sprint_id, username)
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint not found")
    return sprint


@router.put("/sprints/{sprint_id}")
async def edit_sprint(sprint_id: str, body: UpdateSprintBody, session_token: str | None = Cookie(None)):
    username = require_user(session_token)
    if not update_sprint(sprint_id, body.name, body.goal, body.start_date, body.end_date, body.status, username):
        raise HTTPException(status_code=404, detail="Sprint not found")
    return {"detail": "Sprint updated"}


@router.post("/boards/cards/{card_id}/sprint")
async def assign_sprint(card_id: str, body: AssignSprintBody, session_token: str | None = Cookie(None)):
    username = require_user(session_token)
    if not assign_card_to_sprint(card_id, body.sprint_id, username):
        raise HTTPException(status_code=400, detail="Failed to assign card to sprint")
    return {"detail": "Card assigned to sprint"}


@router.delete("/boards/cards/{card_id}/sprint")
async def unassign_sprint(card_id: str, session_token: str | None = Cookie(None)):
    username = require_user(session_token)
    if not remove_card_from_sprint(card_id, username):
        raise HTTPException(status_code=400, detail="Failed to remove card from sprint")
    return {"detail": "Card removed from sprint"}
