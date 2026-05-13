import os
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

JWT_SECRET = os.environ.get("JWT_SECRET", "change-me-in-production-use-32-bytes")
JWT_ALGORITHM = "HS256"
SESSION_TTL_HOURS = 24

# Default credentials from env, hashed with bcrypt at startup
_DEFAULT_USER = os.environ.get("AUTH_USERNAME", "user")
_DEFAULT_PASS = os.environ.get("AUTH_PASSWORD", "password")
_PASSWORD_HASH = bcrypt.hashpw(_DEFAULT_PASS.encode(), bcrypt_salt := bcrypt.gensalt()).decode()
del _DEFAULT_PASS, bcrypt_salt

CREDENTIALS: dict[str, str] = {_DEFAULT_USER: _PASSWORD_HASH}

# Revoked tokens (for logout support with JWT)
_revoked_tokens: set[str] = set()


def verify_password(username: str, password: str) -> bool:
    stored = CREDENTIALS.get(username)
    if not stored:
        return False
    return bcrypt.checkpw(password.encode(), stored.encode())


def create_session(username: str) -> str:
    payload = {
        "sub": username,
        "exp": datetime.now(timezone.utc) + timedelta(hours=SESSION_TTL_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def get_user(token: str) -> str | None:
    if token in _revoked_tokens:
        return None
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload.get("sub")
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None


def delete_session(token: str) -> None:
    _revoked_tokens.add(token)


def is_revoked(token: str) -> bool:
    return token in _revoked_tokens
