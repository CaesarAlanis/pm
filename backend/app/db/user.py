from app.db.connection import get_connection


def list_users(limit: int = 50, offset: int = 0) -> list[dict]:
    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT u.id, u.username, u.created_at, "
            "(SELECT COUNT(*) FROM boards WHERE user_id = u.id AND archived = 0) as board_count "
            "FROM users u ORDER BY u.created_at DESC LIMIT ? OFFSET ?",
            (limit, offset),
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def get_user_stats(user_id: str) -> dict | None:
    conn = get_connection()
    try:
        user = conn.execute("SELECT id, username, created_at FROM users WHERE id = ?", (user_id,)).fetchone()
        if not user:
            return None
        board_count = conn.execute(
            "SELECT COUNT(*) as cnt FROM boards WHERE user_id = ? AND archived = 0",
            (user_id,),
        ).fetchone()["cnt"]
        member_count = conn.execute(
            "SELECT COUNT(DISTINCT board_id) as cnt FROM board_members WHERE user_id = ?",
            (user_id,),
        ).fetchone()["cnt"]
        return {
            "id": user["id"],
            "username": user["username"],
            "created_at": user["created_at"],
            "board_count": board_count,
            "member_board_count": member_count,
        }
    finally:
        conn.close()


def count_users() -> int:
    conn = get_connection()
    try:
        return conn.execute("SELECT COUNT(*) as cnt FROM users").fetchone()["cnt"]
    finally:
        conn.close()
