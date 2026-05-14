import os
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from app.db.connection import get_connection

JWT_SECRET = os.environ.get("JWT_SECRET", "")
JWT_ALGORITHM = "HS256"
SESSION_TTL_HOURS = 24
_DEFAULT_SECRET = "change-me-in-production-use-32-bytes"

if not JWT_SECRET:
    import secrets
    JWT_SECRET = _DEFAULT_SECRET


def verify_password(username: str, password: str) -> bool:
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT password_hash FROM users WHERE username = ?", (username,)
        ).fetchone()
        if not row:
            return False
        return bcrypt.checkpw(password.encode(), row["password_hash"].encode())
    finally:
        conn.close()


def create_user(username: str, password: str) -> str:
    user_id = f"user-{os.urandom(6).hex()}"
    password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    conn = get_connection()
    try:
        conn.execute(
            "INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)",
            (user_id, username, password_hash),
        )
        conn.commit()
        return user_id
    finally:
        conn.close()


def user_exists(username: str) -> bool:
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT 1 FROM users WHERE username = ?", (username,)
        ).fetchone()
        return row is not None
    finally:
        conn.close()


def change_password(username: str, current_password: str, new_password: str) -> bool:
    if not verify_password(username, current_password):
        return False
    new_hash = bcrypt.hashpw(new_password.encode(), bcrypt.gensalt()).decode()
    conn = get_connection()
    try:
        conn.execute(
            "UPDATE users SET password_hash = ? WHERE username = ?",
            (new_hash, username),
        )
        conn.commit()
        return True
    finally:
        conn.close()


def revoke_all_user_sessions(username: str) -> None:
    """Revoke all sessions for a user by adding their tokens to the revoked list."""
    conn = get_connection()
    try:
        user = conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
        if not user:
            return
        # We can't easily find active tokens, but we can use a password_version approach
        # For now, increment a password_version column to invalidate old tokens
        conn.execute(
            """INSERT OR REPLACE INTO user_session_versions (user_id, version)
               VALUES (?, COALESCE((SELECT version FROM user_session_versions WHERE user_id = ?), 0) + 1)""",
            (user["id"], user["id"]),
        )
        conn.commit()
    finally:
        conn.close()


def _get_session_version(user_id: str) -> int:
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT version FROM user_session_versions WHERE user_id = ?",
            (user_id,),
        ).fetchone()
        return row["version"] if row else 0
    finally:
        conn.close()


def create_session(username: str) -> str:
    conn = get_connection()
    try:
        user = conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
        user_id = user["id"] if user else ""
    finally:
        conn.close()
    version = _get_session_version(user_id) if user_id else 0
    payload = {
        "sub": username,
        "uid": user_id,
        "ver": version,
        "exp": datetime.now(timezone.utc) + timedelta(hours=SESSION_TTL_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def get_user(token: str) -> str | None:
    if is_revoked(token):
        return None
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        username = payload.get("sub")
        user_id = payload.get("uid", "")
        token_version = payload.get("ver", 0)
        if user_id:
            current_version = _get_session_version(user_id)
            if token_version < current_version:
                return None
        return username
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None


def delete_session(token: str) -> None:
    conn = get_connection()
    try:
        conn.execute(
            "INSERT OR IGNORE INTO revoked_tokens (token) VALUES (?)",
            (token,),
        )
        conn.commit()
    finally:
        conn.close()


def is_revoked(token: str) -> bool:
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT 1 FROM revoked_tokens WHERE token = ?",
            (token,),
        ).fetchone()
        return row is not None
    finally:
        conn.close()


def cleanup_expired_revoked_tokens() -> int:
    """Remove revoked tokens older than the session TTL since they're expired anyway."""
    conn = get_connection()
    try:
        cur = conn.execute(
            "DELETE FROM revoked_tokens WHERE revoked_at < datetime('now', ?)",
            (f"-{SESSION_TTL_HOURS} hours",),
        )
        conn.commit()
        return cur.rowcount
    finally:
        conn.close()
