import os

from app.db.connection import get_connection


def create_notification(user_id: str, board_id: str, action: str, details: str = "") -> dict:
    conn = get_connection()
    try:
        notif_id = f"ntf-{os.urandom(6).hex()}"
        conn.execute(
            "INSERT INTO notifications (id, user_id, board_id, action, details) VALUES (?, ?, ?, ?, ?)",
            (notif_id, user_id, board_id, action, details),
        )
        conn.commit()
        return {"id": notif_id, "action": action}
    finally:
        conn.close()


def get_notifications_for_user(username: str, unread_only: bool = False) -> list[dict]:
    conn = get_connection()
    try:
        user = conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
        if not user:
            return []
        query = """SELECT n.id, n.board_id, b.title as board_title, n.action, n.details, n.read, n.created_at
                   FROM notifications n
                   JOIN boards b ON n.board_id = b.id
                   WHERE n.user_id = ?"""
        params: list = [user["id"]]
        if unread_only:
            query += " AND n.read = 0"
        query += " ORDER BY n.created_at DESC LIMIT 50"
        rows = conn.execute(query, params).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def mark_notification_read(notification_id: str, username: str) -> bool:
    conn = get_connection()
    try:
        user = conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
        if not user:
            return False
        cur = conn.execute(
            "UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?",
            (notification_id, user["id"]),
        )
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()


def mark_all_notifications_read(username: str) -> int:
    conn = get_connection()
    try:
        user = conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
        if not user:
            return 0
        cur = conn.execute(
            "UPDATE notifications SET read = 1 WHERE user_id = ? AND read = 0",
            (user["id"],),
        )
        conn.commit()
        return cur.rowcount
    finally:
        conn.close()
