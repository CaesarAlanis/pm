import os

from app.db.connection import get_connection
from app.db.card import user_can_edit_card


def log_time(card_id: str, hours: float, username: str, note: str = "") -> dict | None:
    conn = get_connection()
    try:
        if not user_can_edit_card(conn, card_id, username):
            return None
        if hours <= 0:
            return None
        user = conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
        if not user:
            return None
        log_id = f"log-{os.urandom(4).hex()}"
        conn.execute(
            "INSERT INTO time_logs (id, card_id, user_id, hours, note) VALUES (?, ?, ?, ?, ?)",
            (log_id, card_id, user["id"], hours, note),
        )
        # Update actual_hours on the card
        conn.execute(
            "UPDATE cards SET actual_hours = actual_hours + ? WHERE id = ?",
            (hours, card_id),
        )
        conn.commit()
        return {"id": log_id, "card_id": card_id, "hours": hours, "note": note}
    finally:
        conn.close()


def get_time_logs_for_card(card_id: str) -> list[dict]:
    conn = get_connection()
    try:
        rows = conn.execute(
            """SELECT tl.id, tl.card_id, tl.hours, tl.note, tl.logged_at, u.username
               FROM time_logs tl
               JOIN users u ON tl.user_id = u.id
               WHERE tl.card_id = ?
               ORDER BY tl.logged_at""",
            (card_id,),
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def delete_time_log(log_id: str, username: str) -> bool:
    conn = get_connection()
    try:
        log = conn.execute("SELECT card_id, hours FROM time_logs WHERE id = ?", (log_id,)).fetchone()
        if not log:
            return False
        if not user_can_edit_card(conn, log["card_id"], username):
            return False
        conn.execute("DELETE FROM time_logs WHERE id = ?", (log_id,))
        # Update actual_hours on the card
        conn.execute(
            "UPDATE cards SET actual_hours = MAX(0, actual_hours - ?) WHERE id = ?",
            (log["hours"], log["card_id"]),
        )
        conn.commit()
        return True
    finally:
        conn.close()


def get_total_logged_hours(card_id: str) -> float:
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT COALESCE(SUM(hours), 0) as total FROM time_logs WHERE card_id = ?",
            (card_id,),
        ).fetchone()
        return row["total"] if row else 0.0
    finally:
        conn.close()
