from app.db.connection import get_connection, user_owns_column, user_owns_card


def add_card(column_id: str, card_id: str, title: str, details: str, username: str) -> bool:
    conn = get_connection()
    try:
        if not user_owns_column(conn, column_id, username):
            return False
        max_pos = conn.execute(
            "SELECT COALESCE(MAX(position), -1) FROM cards WHERE column_id = ?", (column_id,)
        ).fetchone()[0]
        conn.execute(
            "INSERT INTO cards (id, column_id, title, details, position) VALUES (?, ?, ?, ?, ?)",
            (card_id, column_id, title, details, max_pos + 1),
        )
        conn.commit()
        return True
    finally:
        conn.close()


def update_card(card_id: str, title: str | None, details: str | None, username: str) -> bool:
    conn = get_connection()
    try:
        if not user_owns_card(conn, card_id, username):
            return False
        if title is not None and details is not None:
            cur = conn.execute("UPDATE cards SET title = ?, details = ? WHERE id = ?", (title, details, card_id))
        elif title is not None:
            cur = conn.execute("UPDATE cards SET title = ? WHERE id = ?", (title, card_id))
        elif details is not None:
            cur = conn.execute("UPDATE cards SET details = ? WHERE id = ?", (details, card_id))
        else:
            return False
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()


def delete_card(card_id: str, username: str) -> bool:
    conn = get_connection()
    try:
        if not user_owns_card(conn, card_id, username):
            return False
        cur = conn.execute("DELETE FROM cards WHERE id = ?", (card_id,))
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()


def move_card(card_id: str, target_column_id: str, target_position: int, username: str) -> bool:
    conn = get_connection()
    try:
        if not user_owns_card(conn, card_id, username):
            return False
        if not user_owns_column(conn, target_column_id, username):
            return False

        conn.execute("BEGIN IMMEDIATE")
        card = conn.execute("SELECT column_id, position FROM cards WHERE id = ?", (card_id,)).fetchone()
        if not card:
            conn.rollback()
            return False

        src_col = card["column_id"]
        src_pos = card["position"]

        if src_col == target_column_id and src_pos == target_position:
            conn.rollback()
            return True

        # Close gap in source column
        conn.execute(
            "UPDATE cards SET position = position - 1 WHERE column_id = ? AND position > ?",
            (src_col, src_pos),
        )

        # Make room in target column
        conn.execute(
            "UPDATE cards SET position = position + 1 WHERE column_id = ? AND position >= ?",
            (target_column_id, target_position),
        )

        # If same column, adjust target_position if moving backwards
        if src_col == target_column_id and src_pos < target_position:
            target_position -= 1

        # Place card at target
        conn.execute(
            "UPDATE cards SET column_id = ?, position = ? WHERE id = ?",
            (target_column_id, target_position, card_id),
        )
        conn.commit()
        return True
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
