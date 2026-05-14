from fastapi import APIRouter, Cookie, HTTPException
from pydantic import BaseModel, field_validator

from app.routes.deps import require_user
from app.db import (
    add_comment, get_comments_for_card, update_comment, delete_comment,
    assign_user_to_card, unassign_user_from_card, get_card_assignees,
    add_checklist, get_checklists_for_card, delete_checklist,
    add_checklist_item, toggle_checklist_item, delete_checklist_item,
    log_activity, create_notification,
)
from app.db.connection import get_connection, get_board_id_for_card, user_can_access_card, user_owns_card, user_can_access_board

router = APIRouter()


# --- Comments ---

class CreateCommentBody(BaseModel):
    content: str

    @field_validator("content")
    @classmethod
    def content_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Content is required")
        return v.strip()


class UpdateCommentBody(BaseModel):
    content: str

    @field_validator("content")
    @classmethod
    def content_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Content is required")
        return v.strip()


@router.get("/boards/cards/{card_id}/comments")
async def list_comments(card_id: str, session_token: str | None = Cookie(None)):
    username = require_user(session_token)
    conn = get_connection()
    try:
        if not user_can_access_card(conn, card_id, username):
            raise HTTPException(status_code=403, detail="Not authorized to access this card")
    finally:
        conn.close()
    comments = get_comments_for_card(card_id)
    return {"comments": comments}


@router.post("/boards/cards/{card_id}/comments")
async def create_comment(card_id: str, body: CreateCommentBody, session_token: str | None = Cookie(None)):
    username = require_user(session_token)
    conn = get_connection()
    try:
        if not user_can_access_card(conn, card_id, username):
            raise HTTPException(status_code=403, detail="Not authorized to access this card")
    finally:
        conn.close()
    result = add_comment(card_id, body.content, username)
    if not result:
        raise HTTPException(status_code=400, detail="Failed to add comment")
    return result


@router.put("/boards/comments/{comment_id}")
async def edit_comment(comment_id: str, body: UpdateCommentBody, session_token: str | None = Cookie(None)):
    username = require_user(session_token)
    if not update_comment(comment_id, body.content, username):
        raise HTTPException(status_code=404, detail="Comment not found")
    return {"detail": "Comment updated"}


@router.delete("/boards/comments/{comment_id}")
async def remove_comment(comment_id: str, session_token: str | None = Cookie(None)):
    username = require_user(session_token)
    if not delete_comment(comment_id, username):
        raise HTTPException(status_code=404, detail="Comment not found")
    return {"detail": "Comment deleted"}


# --- Assignees ---

class AssignUserBody(BaseModel):
    username: str

    @field_validator("username")
    @classmethod
    def username_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Username is required")
        return v.strip()


@router.get("/boards/cards/{card_id}/assignees")
async def list_assignees(card_id: str, session_token: str | None = Cookie(None)):
    username = require_user(session_token)
    conn = get_connection()
    try:
        if not user_can_access_card(conn, card_id, username):
            raise HTTPException(status_code=403, detail="Not authorized to access this card")
    finally:
        conn.close()
    assignees = get_card_assignees(card_id)
    return {"assignees": assignees}


@router.post("/boards/cards/{card_id}/assignees")
async def assign_user(card_id: str, body: AssignUserBody, session_token: str | None = Cookie(None)):
    username = require_user(session_token)
    conn = get_connection()
    try:
        if not user_can_access_card(conn, card_id, username, min_role="editor"):
            raise HTTPException(status_code=403, detail="Not authorized to modify this card")
    finally:
        conn.close()
    result = assign_user_to_card(card_id, body.username, username)
    if not result:
        raise HTTPException(status_code=400, detail="Failed to assign user. Check username and permissions.")
    conn = get_connection()
    try:
        board_id = get_board_id_for_card(conn, card_id)
        if board_id:
            log_activity(board_id, username, "assigned", f"Assigned {body.username} to card")
            assignee_user = conn.execute("SELECT id FROM users WHERE username = ?", (body.username,)).fetchone()
            if assignee_user:
                create_notification(assignee_user["id"], board_id, "assigned", f"{username} assigned you to a card")
    finally:
        conn.close()
    return result


@router.delete("/boards/cards/{card_id}/assignees/{assignee_username}")
async def unassign_user(card_id: str, assignee_username: str, session_token: str | None = Cookie(None)):
    username = require_user(session_token)
    conn = get_connection()
    try:
        if not user_can_access_card(conn, card_id, username, min_role="editor"):
            raise HTTPException(status_code=403, detail="Not authorized to modify this card")
    finally:
        conn.close()
    if not unassign_user_from_card(card_id, assignee_username, username):
        raise HTTPException(status_code=400, detail="Failed to unassign user")
    return {"detail": "User unassigned"}


# --- Checklists ---

class CreateChecklistBody(BaseModel):
    title: str

    @field_validator("title")
    @classmethod
    def title_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Title is required")
        return v.strip()


class CreateChecklistItemBody(BaseModel):
    content: str

    @field_validator("content")
    @classmethod
    def content_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Content is required")
        return v.strip()


class ToggleChecklistItemBody(BaseModel):
    checked: bool


@router.get("/boards/cards/{card_id}/checklists")
async def list_checklists(card_id: str, session_token: str | None = Cookie(None)):
    username = require_user(session_token)
    conn = get_connection()
    try:
        if not user_can_access_card(conn, card_id, username):
            raise HTTPException(status_code=403, detail="Not authorized to access this card")
    finally:
        conn.close()
    checklists = get_checklists_for_card(card_id)
    return {"checklists": checklists}


@router.post("/boards/cards/{card_id}/checklists")
async def create_checklist(card_id: str, body: CreateChecklistBody, session_token: str | None = Cookie(None)):
    username = require_user(session_token)
    conn = get_connection()
    try:
        if not user_can_access_card(conn, card_id, username, min_role="editor"):
            raise HTTPException(status_code=403, detail="Not authorized to modify this card")
    finally:
        conn.close()
    result = add_checklist(card_id, body.title, username)
    if not result:
        raise HTTPException(status_code=400, detail="Failed to add checklist")
    return result


@router.delete("/boards/checklists/{checklist_id}")
async def remove_checklist(checklist_id: str, session_token: str | None = Cookie(None)):
    username = require_user(session_token)
    if not delete_checklist(checklist_id, username):
        raise HTTPException(status_code=404, detail="Checklist not found")
    return {"detail": "Checklist deleted"}


@router.post("/boards/checklists/{checklist_id}/items")
async def create_checklist_item(checklist_id: str, body: CreateChecklistItemBody, session_token: str | None = Cookie(None)):
    username = require_user(session_token)
    result = add_checklist_item(checklist_id, body.content, username)
    if not result:
        raise HTTPException(status_code=400, detail="Failed to add checklist item")
    return result


@router.put("/boards/checklist-items/{item_id}/toggle")
async def toggle_item(item_id: str, body: ToggleChecklistItemBody, session_token: str | None = Cookie(None)):
    username = require_user(session_token)
    if not toggle_checklist_item(item_id, body.checked, username):
        raise HTTPException(status_code=404, detail="Checklist item not found")
    return {"detail": "Item toggled"}


@router.delete("/boards/checklist-items/{item_id}")
async def remove_checklist_item(item_id: str, session_token: str | None = Cookie(None)):
    username = require_user(session_token)
    if not delete_checklist_item(item_id, username):
        raise HTTPException(status_code=404, detail="Checklist item not found")
    return {"detail": "Item deleted"}
