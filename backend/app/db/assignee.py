from app.db.connection import get_connection, user_owns_card


def assign_user_to_card(card_id: str, username: str, assigner_username: str) -> dict | None:
    conn = get_connection()
    try:
        if not user_owns_card(conn, card_id, assigner_username):
            return None
        user = conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
        if not user:
            return None
        existing = conn.execute(
            "SELECT 1 FROM card_assignees WHERE card_id = ? AND user_id = ?",
            (card_id, user["id"]),
        ).fetchone()
        if existing:
            return None
        conn.execute(
            "INSERT INTO card_assignees (card_id, user_id) VALUES (?, ?)",
            (card_id, user["id"]),
        )
        conn.commit()
        return {"card_id": card_id, "username": username}
    finally:
        conn.close()


def unassign_user_from_card(card_id: str, username: str, remover_username: str) -> bool:
    conn = get_connection()
    try:
        if not user_owns_card(conn, card_id, remover_username):
            return False
        user = conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
        if not user:
            return False
        cur = conn.execute(
            "DELETE FROM card_assignees WHERE card_id = ? AND user_id = ?",
            (card_id, user["id"]),
        )
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()


def get_card_assignees(card_id: str) -> list[dict]:
    conn = get_connection()
    try:
        rows = conn.execute(
            """SELECT u.username, ca.assigned_at
               FROM card_assignees ca
               JOIN users u ON ca.user_id = u.id
               WHERE ca.card_id = ?
               ORDER BY ca.assigned_at""",
            (card_id,),
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()
