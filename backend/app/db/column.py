import os

from app.db.connection import get_connection, user_owns_column, user_owns_board, user_can_access_board, get_board_id_for_column


def user_can_edit_column(conn, column_id: str, username: str) -> bool:
    if user_owns_column(conn, column_id, username):
        return True
    board_id = get_board_id_for_column(conn, column_id)
    if board_id and user_can_access_board(conn, board_id, username, min_role="editor"):
        return True
    return False


def rename_column(column_id: str, title: str, username: str) -> bool:
    conn = get_connection()
    try:
        if not user_can_edit_column(conn, column_id, username):
            return False
        cur = conn.execute("UPDATE columns SET title = ? WHERE id = ?", (title, column_id))
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()


def add_column(board_id: str, title: str, username: str) -> dict | None:
    conn = get_connection()
    try:
        if not user_can_access_board(conn, board_id, username, min_role="editor"):
            return None
        max_pos = conn.execute(
            "SELECT COALESCE(MAX(position), -1) FROM columns WHERE board_id = ?",
            (board_id,),
        ).fetchone()[0]
        col_id = f"col-{os.urandom(4).hex()}"
        conn.execute(
            "INSERT INTO columns (id, board_id, title, position) VALUES (?, ?, ?, ?)",
            (col_id, board_id, title, max_pos + 1),
        )
        conn.commit()
        return {"id": col_id, "title": title, "position": max_pos + 1}
    finally:
        conn.close()


def delete_column(column_id: str, username: str) -> bool:
    conn = get_connection()
    try:
        if not user_can_edit_column(conn, column_id, username):
            return False
        conn.execute("DELETE FROM cards WHERE column_id = ?", (column_id,))
        cur = conn.execute("DELETE FROM columns WHERE id = ?", (column_id,))
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()
