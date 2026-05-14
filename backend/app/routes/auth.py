import re

from fastapi import APIRouter, Cookie, HTTPException, Query, Request, Response
from pydantic import BaseModel, field_validator

from app.session import create_session, delete_session, verify_password, create_user, user_exists, change_password, revoke_all_user_sessions
from app.routes.deps import require_user, limiter, COOKIE_SECURE
from app.db.connection import get_connection
from app.db.user import list_users, count_users

router = APIRouter()


class LoginBody(BaseModel):
    username: str
    password: str


class RegisterBody(BaseModel):
    username: str
    password: str

    @field_validator("username")
    @classmethod
    def username_valid(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Username is required")
        if len(v) < 3:
            raise ValueError("Username must be at least 3 characters")
        if len(v) > 30:
            raise ValueError("Username must be at most 30 characters")
        if not re.match(r"^[a-zA-Z0-9_-]+$", v):
            raise ValueError("Username can only contain letters, numbers, hyphens, and underscores")
        return v

    @field_validator("password")
    @classmethod
    def password_valid(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v


class ChangePasswordBody(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def new_password_valid(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v


@router.get("/hello")
async def hello():
    return {"message": "Hello from the PM app!"}


@router.get("/health")
async def health():
    return {"status": "ok"}


@router.post("/auth/login")
@limiter.limit("5/minute")
async def login(request: Request, response: Response, body: LoginBody):
    if not verify_password(body.username, body.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_session(body.username)
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        samesite="lax",
        secure=COOKIE_SECURE,
    )
    return {"username": body.username}


@router.post("/auth/register")
@limiter.limit("5/minute")
async def register(request: Request, response: Response, body: RegisterBody):
    if user_exists(body.username):
        raise HTTPException(status_code=409, detail="Username already taken")
    user_id = create_user(body.username, body.password)
    token = create_session(body.username)
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        samesite="lax",
        secure=COOKIE_SECURE,
    )
    return {"username": body.username}


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


@router.put("/auth/password")
async def update_password(body: ChangePasswordBody, response: Response, session_token: str | None = Cookie(None)):
    username = require_user(session_token)
    if not change_password(username, body.current_password, body.new_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    revoke_all_user_sessions(username)
    if session_token:
        delete_session(session_token)
    new_token = create_session(username)
    response.set_cookie(
        key="session_token",
        value=new_token,
        httponly=True,
        samesite="lax",
        secure=COOKIE_SECURE,
    )
    return {"detail": "Password updated"}


@router.get("/auth/profile")
async def profile(session_token: str | None = Cookie(None)):
    username = require_user(session_token)
    conn = get_connection()
    try:
        user = conn.execute(
            "SELECT id, username, created_at FROM users WHERE username = ?",
            (username,),
        ).fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        board_count = conn.execute(
            "SELECT COUNT(*) FROM boards WHERE user_id = ?", (user["id"],)
        ).fetchone()[0]
        return {
            "username": user["username"],
            "created_at": user["created_at"],
            "board_count": board_count,
        }
    finally:
        conn.close()


@router.get("/auth/users/search")
async def search_users(q: str = "", session_token: str | None = Cookie(None)):
    require_user(session_token)
    if not q or len(q) < 2:
        return {"users": []}
    conn = get_connection()
    try:
        safe_q = q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        rows = conn.execute(
            "SELECT username FROM users WHERE username LIKE ? ESCAPE '\\' LIMIT 10",
            (f"%{safe_q}%",),
        ).fetchall()
        return {"users": [r["username"] for r in rows]}
    finally:
        conn.close()


@router.get("/auth/users")
async def get_users(limit: int = Query(50, ge=1, le=100), offset: int = Query(0, ge=0), session_token: str | None = Cookie(None)):
    require_user(session_token)
    users = list_users(limit=limit, offset=offset)
    total = count_users()
    return {"users": users, "total": total}
