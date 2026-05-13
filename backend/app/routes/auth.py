from fastapi import APIRouter, Cookie, HTTPException, Request, Response
from pydantic import BaseModel

from app.session import create_session, delete_session, verify_password
from app.routes.deps import require_user, limiter, COOKIE_SECURE

router = APIRouter()


class LoginBody(BaseModel):
    username: str
    password: str


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
