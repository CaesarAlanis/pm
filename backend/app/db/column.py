from app.db.connection import get_connection, user_owns_column


def rename_column(column_id: str, title: str, username: str) -> bool:
    conn = get_connection()
    try:
        if not user_owns_column(conn, column_id, username):
            return False
        cur = conn.execute("UPDATE columns SET title = ? WHERE id = ?", (title, column_id))
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()
