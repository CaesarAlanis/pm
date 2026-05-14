from fastapi import APIRouter, Cookie, HTTPException, Query

from app.routes.deps import require_user
from app.db.analytics import get_board_statistics, get_velocity_metrics, get_user_dashboard

router = APIRouter()


@router.get("/analytics/dashboard")
async def dashboard(session_token: str | None = Cookie(None)):
    username = require_user(session_token)
    return get_user_dashboard(username)


@router.get("/analytics/board/{board_id}")
async def board_analytics(board_id: str, session_token: str | None = Cookie(None)):
    username = require_user(session_token)
    stats = get_board_statistics(board_id, username)
    if stats is None:
        raise HTTPException(status_code=404, detail="Board not found")
    return stats


@router.get("/analytics/board/{board_id}/velocity")
async def board_velocity(board_id: str, session_token: str | None = Cookie(None), period: str = Query("week")):
    username = require_user(session_token)
    return {"velocity": get_velocity_metrics(board_id, username, period)}
