from fastapi import APIRouter, Cookie, HTTPException, Query

from app.routes.deps import require_user
from app.db import get_notifications_for_user, mark_notification_read, mark_all_notifications_read

router = APIRouter()


@router.get("/notifications")
async def list_notifications(
    session_token: str | None = Cookie(None),
    unread: bool = Query(False),
):
    username = require_user(session_token)
    notifications = get_notifications_for_user(username, unread_only=unread)
    return {"notifications": notifications}


@router.put("/notifications/{notification_id}/read")
async def read_notification(notification_id: str, session_token: str | None = Cookie(None)):
    username = require_user(session_token)
    if not mark_notification_read(notification_id, username):
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"detail": "Notification marked as read"}


@router.put("/notifications/read-all")
async def read_all_notifications(session_token: str | None = Cookie(None)):
    username = require_user(session_token)
    count = mark_all_notifications_read(username)
    return {"detail": f"Marked {count} notifications as read"}
