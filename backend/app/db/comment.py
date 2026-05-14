import os

from app.db.connection import get_connection, user_owns_card


def add_comment(card_id: str, content: str, username: str) -> dict | None:
    conn = get_connection()
    try:
        if not user_owns_card(conn, card_id, username):
            return None
        user = conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
        if not user:
            return None
        comment_id = f"cmt-{os.urandom(6).hex()}"
        conn.execute(
            "INSERT INTO comments (id, card_id, user_id, content) VALUES (?, ?, ?, ?)",
            (comment_id, card_id, user["id"], content),
        )
        conn.commit()
        return {"id": comment_id, "card_id": card_id, "username": username, "content": content}
    finally:
        conn.close()


def get_comments_for_card(card_id: str) -> list[dict]:
    conn = get_connection()
    try:
        rows = conn.execute(
            """SELECT c.id, c.card_id, u.username, c.content, c.created_at, c.updated_at
               FROM comments c
               JOIN users u ON c.user_id = u.id
               WHERE c.card_id = ?
               ORDER BY c.created_at ASC""",
            (card_id,),
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def update_comment(comment_id: str, content: str, username: str) -> bool:
    conn = get_connection()
    try:
        user = conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
        if not user:
            return False
        cur = conn.execute(
            "UPDATE comments SET content = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?",
            (content, comment_id, user["id"]),
        )
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()


def delete_comment(comment_id: str, username: str) -> bool:
    conn = get_connection()
    try:
        user = conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
        if not user:
            return False
        cur = conn.execute(
            "DELETE FROM comments WHERE id = ? AND user_id = ?",
            (comment_id, user["id"]),
        )
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()
