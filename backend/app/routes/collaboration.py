from fastapi import APIRouter, Cookie, HTTPException
from pydantic import BaseModel, field_validator

from app.routes.deps import require_user
from app.db import add_board_member, remove_board_member, get_board_members, get_activity_log
from app.db.connection import get_connection, user_owns_board, user_can_access_board

router = APIRouter()


class AddMemberBody(BaseModel):
    board_id: str
    username: str
    role: str = "editor"

    @field_validator("role")
    @classmethod
    def role_valid(cls, v: str) -> str:
        if v not in ("editor", "viewer"):
            raise ValueError("Role must be editor or viewer")
        return v

    @field_validator("username")
    @classmethod
    def username_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Username is required")
        return v.strip()


class RemoveMemberBody(BaseModel):
    board_id: str
    username: str


@router.get("/boards/{board_id}/members")
async def list_members(board_id: str, session_token: str | None = Cookie(None)):
    username = require_user(session_token)
    conn = get_connection()
    try:
        if not user_can_access_board(conn, board_id, username):
            raise HTTPException(status_code=403, detail="Not authorized to view this board")
    finally:
        conn.close()
    members = get_board_members(board_id)
    return {"members": members}


@router.post("/boards/{board_id}/members")
async def invite_member(board_id: str, body: AddMemberBody, session_token: str | None = Cookie(None)):
    username = require_user(session_token)
    conn = get_connection()
    try:
        if not user_owns_board(conn, board_id, username):
            raise HTTPException(status_code=403, detail="Only the board owner can invite members")
    finally:
        conn.close()
    result = add_board_member(body.board_id, body.username, body.role, inviter_username=username)
    if not result:
        raise HTTPException(status_code=400, detail="Failed to add member. Check username and permissions.")
    return result


@router.delete("/boards/{board_id}/members/{member_username}")
async def kick_member(board_id: str, member_username: str, session_token: str | None = Cookie(None)):
    username = require_user(session_token)
    conn = get_connection()
    try:
        if not user_owns_board(conn, board_id, username):
            raise HTTPException(status_code=403, detail="Only the board owner can remove members")
    finally:
        conn.close()
    if not remove_board_member(board_id, member_username, remover_username=username):
        raise HTTPException(status_code=400, detail="Failed to remove member")
    return {"detail": "Member removed"}


@router.get("/boards/{board_id}/activity")
async def get_activity(board_id: str, session_token: str | None = Cookie(None)):
    username = require_user(session_token)
    conn = get_connection()
    try:
        if not user_can_access_board(conn, board_id, username):
            raise HTTPException(status_code=403, detail="Not authorized to view this board")
    finally:
        conn.close()
    activity = get_activity_log(board_id)
    return {"activity": activity}
