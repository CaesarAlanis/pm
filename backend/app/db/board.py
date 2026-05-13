from app.db.connection import get_connection, board_id_for_user


def get_board(username: str) -> dict | None:
    conn = get_connection()
    try:
        user = conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
        if not user:
            return None
        board = conn.execute("SELECT id, title FROM boards WHERE user_id = ?", (user["id"],)).fetchone()
        if not board:
            return None
        columns = conn.execute(
            "SELECT id, title, position FROM columns WHERE board_id = ? ORDER BY position",
            (board["id"],),
        ).fetchall()
        result_columns = []
        for col in columns:
            cards = conn.execute(
                "SELECT id, title, details, position FROM cards WHERE column_id = ? ORDER BY position",
                (col["id"],),
            ).fetchall()
            result_columns.append({
                "id": col["id"],
                "title": col["title"],
                "position": col["position"],
                "cards": [dict(c) for c in cards],
            })
        return {"id": board["id"], "title": board["title"], "columns": result_columns}
    finally:
        conn.close()


def apply_board_update(board_data: dict, username: str) -> None:
    """Apply a full board update from the AI, replacing columns and cards."""
    conn = get_connection()
    try:
        bid = board_id_for_user(conn, username)
        if not bid:
            return

        conn.execute("BEGIN IMMEDIATE")

        conn.execute("DELETE FROM cards WHERE column_id IN (SELECT id FROM columns WHERE board_id = ?)", (bid,))
        conn.execute("DELETE FROM columns WHERE board_id = ?", (bid,))

        for col in board_data.get("columns", []):
            conn.execute(
                "INSERT INTO columns (id, board_id, title, position) VALUES (?, ?, ?, ?)",
                (col["id"], bid, col["title"], col.get("position", 0)),
            )
            for card in col.get("cards", []):
                conn.execute(
                    "INSERT INTO cards (id, column_id, title, details, position) VALUES (?, ?, ?, ?, ?)",
                    (card["id"], col["id"], card["title"], card.get("details", ""), card.get("position", 0)),
                )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
