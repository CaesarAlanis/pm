import os

from app.db.connection import get_connection


def update_board_settings(board_id: str, username: str, wip_limit: int | None = None, default_card_type: str | None = None, description: str | None = None) -> bool:
    conn = get_connection()
    try:
        user = conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
        if not user:
            return False
        board = conn.execute(
            "SELECT id FROM boards WHERE id = ? AND user_id = ?",
            (board_id, user["id"]),
        ).fetchone()
        if not board:
            return False
        sets = []
        params = []
        if wip_limit is not None:
            sets.append("wip_limit = ?")
            params.append(wip_limit)
        if default_card_type is not None:
            sets.append("default_card_type = ?")
            params.append(default_card_type)
        if description is not None:
            sets.append("description = ?")
            params.append(description)
        if not sets:
            return False
        params.append(board_id)
        cur = conn.execute(f"UPDATE boards SET {', '.join(sets)} WHERE id = ?", params)
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()
