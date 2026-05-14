import os
import logging

from fastapi import Cookie, HTTPException
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.session import get_user

logger = logging.getLogger(__name__)

_test_mode = os.environ.get("TESTING", "").lower() == "true"
limiter = Limiter(key_func=get_remote_address, enabled=not _test_mode)

COOKIE_SECURE = os.environ.get("COOKIE_SECURE", "false").lower() == "true"


def require_user(session_token: str | None = Cookie(None)) -> str:
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    username = get_user(session_token)
    if not username:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return username
