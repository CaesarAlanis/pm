import os

from app.db.connection import get_connection, get_board_id_for_card
from app.db.card import user_can_edit_card


def add_attachment(card_id: str, filename: str, file_path: str, file_size: int, content_type: str, username: str) -> dict | None:
    conn = get_connection()
    try:
        if not user_can_edit_card(conn, card_id, username):
            return None
        att_id = f"att-{os.urandom(4).hex()}"
        user = conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
        if not user:
            return None
        conn.execute(
            "INSERT INTO card_attachments (id, card_id, filename, file_path, file_size, content_type, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (att_id, card_id, filename, file_path, file_size, content_type, user["id"]),
        )
        conn.commit()
        return {"id": att_id, "card_id": card_id, "filename": filename, "file_size": file_size, "content_type": content_type}
    finally:
        conn.close()


def get_attachments_for_card(card_id: str) -> list[dict]:
    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT id, card_id, filename, file_size, content_type, uploaded_by, created_at FROM card_attachments WHERE card_id = ? ORDER BY created_at",
            (card_id,),
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def delete_attachment(attachment_id: str, username: str) -> bool:
    conn = get_connection()
    try:
        att = conn.execute("SELECT card_id, file_path FROM card_attachments WHERE id = ?", (attachment_id,)).fetchone()
        if not att:
            return False
        if not user_can_edit_card(conn, att["card_id"], username):
            return False
        file_path = att["file_path"]
        conn.execute("DELETE FROM card_attachments WHERE id = ?", (attachment_id,))
        conn.commit()
        # Try to delete the file from disk
        if file_path and os.path.exists(file_path):
            try:
                os.unlink(file_path)
            except OSError:
                pass
        return True
    finally:
        conn.close()
