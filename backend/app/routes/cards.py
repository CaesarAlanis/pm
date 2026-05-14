import os
import shutil
from fastapi import APIRouter, Cookie, HTTPException, UploadFile, File, Form
from pydantic import BaseModel, field_validator

from app.routes.deps import require_user
from app.db import add_attachment, get_attachments_for_card, delete_attachment, add_card_link, remove_card_link as db_remove_card_link, get_card_links, log_time, get_time_logs_for_card, delete_time_log
from app.db.card import user_can_edit_card
from app.db.connection import get_connection

router = APIRouter()

UPLOAD_DIR = os.environ.get("UPLOAD_DIR", os.path.join(os.path.dirname(__file__), "..", "..", "data", "uploads"))


class AddCardLinkBody(BaseModel):
    target_card_id: str
    link_type: str

    @field_validator("link_type")
    @classmethod
    def link_type_valid(cls, v: str) -> str:
        if v not in ("blocked_by", "relates_to"):
            raise ValueError("Link type must be blocked_by or relates_to")
        return v


class LogTimeBody(BaseModel):
    hours: float
    note: str = ""

    @field_validator("hours")
    @classmethod
    def hours_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Hours must be positive")
        return v


# --- Attachments ---

@router.post("/boards/cards/{card_id}/attachments")
async def upload_attachment(card_id: str, file: UploadFile = File(...), session_token: str | None = Cookie(None)):
    username = require_user(session_token)
    conn = get_connection()
    if not user_can_edit_card(conn, card_id, username):
        conn.close()
        raise HTTPException(status_code=403, detail="Cannot access card")
    conn.close()

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    att_id = f"att-{os.urandom(4).hex()}"
    file_ext = os.path.splitext(file.filename or "file")[1]
    save_path = os.path.join(UPLOAD_DIR, f"{att_id}{file_ext}")

    with open(save_path, "wb") as f:
        content = await file.read()
        f.write(content)

    file_size = len(content)
    content_type = file.content_type or "application/octet-stream"

    result = add_attachment(card_id, file.filename or "file", save_path, file_size, content_type, username)
    if not result:
        if os.path.exists(save_path):
            os.unlink(save_path)
        raise HTTPException(status_code=400, detail="Failed to add attachment")
    return result


@router.get("/boards/cards/{card_id}/attachments")
async def list_attachments(card_id: str, session_token: str | None = Cookie(None)):
    require_user(session_token)
    return {"attachments": get_attachments_for_card(card_id)}


@router.delete("/boards/cards/{card_id}/attachments/{attachment_id}")
async def remove_attachment(card_id: str, attachment_id: str, session_token: str | None = Cookie(None)):
    username = require_user(session_token)
    if not delete_attachment(attachment_id, username):
        raise HTTPException(status_code=404, detail="Attachment not found")
    return {"detail": "Attachment deleted"}


# --- Card Links ---

@router.post("/boards/cards/{card_id}/links")
async def create_card_link(card_id: str, body: AddCardLinkBody, session_token: str | None = Cookie(None)):
    username = require_user(session_token)
    result = add_card_link(card_id, body.target_card_id, body.link_type, username)
    if not result:
        raise HTTPException(status_code=400, detail="Failed to add link")
    return result


@router.get("/boards/cards/{card_id}/links")
async def list_card_links(card_id: str, session_token: str | None = Cookie(None)):
    require_user(session_token)
    return {"links": get_card_links(card_id)}


@router.delete("/boards/cards/{card_id}/links/{link_id}")
async def delete_card_link(card_id: str, link_id: str, session_token: str | None = Cookie(None)):
    username = require_user(session_token)
    if not db_remove_card_link(link_id, username):
        raise HTTPException(status_code=404, detail="Link not found")
    return {"detail": "Link removed"}


# --- Time Tracking ---

@router.post("/boards/cards/{card_id}/time")
async def create_time_log(card_id: str, body: LogTimeBody, session_token: str | None = Cookie(None)):
    username = require_user(session_token)
    result = log_time(card_id, body.hours, username, body.note)
    if not result:
        raise HTTPException(status_code=400, detail="Failed to log time")
    return result


@router.get("/boards/cards/{card_id}/time")
async def list_time_logs(card_id: str, session_token: str | None = Cookie(None)):
    require_user(session_token)
    return {"logs": get_time_logs_for_card(card_id)}


@router.delete("/boards/cards/{card_id}/time/{log_id}")
async def remove_time_log(card_id: str, log_id: str, session_token: str | None = Cookie(None)):
    username = require_user(session_token)
    if not delete_time_log(log_id, username):
        raise HTTPException(status_code=404, detail="Time log not found")
    return {"detail": "Time log deleted"}
