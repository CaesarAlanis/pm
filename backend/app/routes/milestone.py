from fastapi import APIRouter, Cookie, HTTPException
from pydantic import BaseModel, field_validator

from app.routes.deps import require_user
from app.db.milestone import create_milestone, get_milestones, update_milestone, delete_milestone

router = APIRouter()


class CreateMilestoneBody(BaseModel):
    name: str
    description: str = ""
    due_date: str | None = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Name is required")
        return v.strip()


class UpdateMilestoneBody(BaseModel):
    name: str | None = None
    description: str | None = None
    due_date: str | None = None
    status: str | None = None

    @field_validator("status")
    @classmethod
    def status_valid(cls, v: str | None) -> str | None:
        if v is not None and v not in ("upcoming", "in_progress", "completed"):
            raise ValueError("Status must be upcoming, in_progress, or completed")
        return v


@router.post("/boards/{board_id}/milestones")
async def new_milestone(board_id: str, body: CreateMilestoneBody, session_token: str | None = Cookie(None)):
    username = require_user(session_token)
    milestone = create_milestone(board_id, body.name, body.description, body.due_date, username)
    if not milestone:
        raise HTTPException(status_code=400, detail="Failed to create milestone")
    return milestone


@router.get("/boards/{board_id}/milestones")
async def list_milestones(board_id: str, session_token: str | None = Cookie(None)):
    username = require_user(session_token)
    return {"milestones": get_milestones(board_id, username)}


@router.put("/milestones/{milestone_id}")
async def edit_milestone(milestone_id: str, body: UpdateMilestoneBody, session_token: str | None = Cookie(None)):
    username = require_user(session_token)
    if not update_milestone(milestone_id, body.name, body.description, body.due_date, body.status, username):
        raise HTTPException(status_code=404, detail="Milestone not found")
    return {"detail": "Milestone updated"}


@router.delete("/milestones/{milestone_id}")
async def remove_milestone(milestone_id: str, session_token: str | None = Cookie(None)):
    username = require_user(session_token)
    if not delete_milestone(milestone_id, username):
        raise HTTPException(status_code=404, detail="Milestone not found")
    return {"detail": "Milestone deleted"}
