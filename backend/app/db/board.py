import os

from app.db.connection import get_connection, board_id_for_user

DEFAULT_COLUMNS = [
    ("col-backlog", "Backlog", 0),
    ("col-discovery", "Discovery", 1),
    ("col-progress", "In Progress", 2),
    ("col-review", "Review", 3),
    ("col-done", "Done", 4),
]


def get_boards_for_user(username: str, include_archived: bool = False) -> list[dict]:
    conn = get_connection()
    try:
        user = conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
        if not user:
            return []
        # Boards owned by user
        archive_filter = "" if include_archived else " AND b.archived = 0"
        rows = conn.execute(
            f"""SELECT b.id, b.title, b.description, b.archived, b.favorite, b.created_at, b.updated_at FROM boards b
               WHERE b.user_id = ?{archive_filter}
               ORDER BY b.favorite DESC, b.created_at""",
            (user["id"],),
        ).fetchall()
        owned_ids = {r["id"] for r in rows}
        # Boards where user is a member
        member_rows = conn.execute(
            f"""SELECT b.id, b.title, b.description, b.archived, b.favorite, b.created_at, b.updated_at FROM boards b
               JOIN board_members bm ON b.id = bm.board_id
               WHERE bm.user_id = ?{archive_filter}
               ORDER BY b.created_at""",
            (user["id"],),
        ).fetchall()
        for r in member_rows:
            if r["id"] not in owned_ids:
                rows.append(r)
        return [dict(r) for r in rows]
    finally:
        conn.close()


def get_board_by_id(board_id: str, username: str) -> dict | None:
    conn = get_connection()
    try:
        user = conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
        if not user:
            return None
        board = conn.execute(
            "SELECT id, title, description, archived, favorite, created_at, updated_at FROM boards WHERE id = ? AND user_id = ?",
            (board_id, user["id"]),
        ).fetchone()
        if not board:
            # Check if user is a board member
            member = conn.execute(
                """SELECT 1 FROM board_members
                   WHERE board_id = ? AND user_id = ?""",
                (board_id, user["id"]),
            ).fetchone()
            if not member:
                return None
            board = conn.execute(
                "SELECT id, title, description, archived, favorite, created_at, updated_at FROM boards WHERE id = ?",
                (board_id,),
            ).fetchone()
            if not board:
                return None
        columns = conn.execute(
            "SELECT id, title, position FROM columns WHERE board_id = ? ORDER BY position",
            (board["id"],),
        ).fetchall()
        result_columns = []
        for col in columns:
            cards = conn.execute(
                "SELECT id, title, details, position, priority, due_date, labels, story_points, estimated_hours, actual_hours FROM cards WHERE column_id = ? ORDER BY position",
                (col["id"],),
            ).fetchall()
            result_columns.append({
                "id": col["id"],
                "title": col["title"],
                "position": col["position"],
                "cards": [dict(c) for c in cards],
            })
        return {
            "id": board["id"],
            "title": board["title"],
            "description": board["description"],
            "archived": board["archived"],
            "favorite": board["favorite"],
            "created_at": board["created_at"],
            "updated_at": board["updated_at"],
            "columns": result_columns,
        }
    finally:
        conn.close()


def get_board(username: str) -> dict | None:
    conn = get_connection()
    try:
        bid = board_id_for_user(conn, username)
        if not bid:
            return None
        return get_board_by_id(bid, username)
    finally:
        conn.close()


def create_board(username: str, title: str = "New Board", column_names: list[str] | None = None, description: str = "") -> dict:
    conn = get_connection()
    try:
        user = conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
        if not user:
            raise ValueError("User not found")
        board_id = f"board-{os.urandom(4).hex()}"
        conn.execute(
            "INSERT INTO boards (id, user_id, title, description) VALUES (?, ?, ?, ?)",
            (board_id, user["id"], title, description),
        )
        columns = column_names or [t[1] for t in DEFAULT_COLUMNS]
        for pos, col_title in enumerate(columns):
            col_id = f"col-{os.urandom(4).hex()}"
            conn.execute(
                "INSERT INTO columns (id, board_id, title, position) VALUES (?, ?, ?, ?)",
                (col_id, board_id, col_title, pos),
            )
        conn.commit()
        return {"id": board_id, "title": title}
    finally:
        conn.close()


def delete_board(board_id: str, username: str) -> bool:
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
        conn.execute("DELETE FROM cards WHERE column_id IN (SELECT id FROM columns WHERE board_id = ?)", (board_id,))
        conn.execute("DELETE FROM columns WHERE board_id = ?", (board_id,))
        conn.execute("DELETE FROM boards WHERE id = ?", (board_id,))
        conn.commit()
        return True
    finally:
        conn.close()


def update_board_title(board_id: str, title: str, username: str) -> bool:
    conn = get_connection()
    try:
        user = conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
        if not user:
            return False
        cur = conn.execute(
            "UPDATE boards SET title = ? WHERE id = ? AND user_id = ?",
            (title, board_id, user["id"]),
        )
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()


def archive_board(board_id: str, username: str) -> bool:
    conn = get_connection()
    try:
        user = conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
        if not user:
            return False
        cur = conn.execute(
            "UPDATE boards SET archived = 1 WHERE id = ? AND user_id = ?",
            (board_id, user["id"]),
        )
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()


def unarchive_board(board_id: str, username: str) -> bool:
    conn = get_connection()
    try:
        user = conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
        if not user:
            return False
        cur = conn.execute(
            "UPDATE boards SET archived = 0 WHERE id = ? AND user_id = ?",
            (board_id, user["id"]),
        )
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()


def toggle_board_favorite(board_id: str, username: str) -> bool:
    conn = get_connection()
    try:
        user = conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
        if not user:
            return False
        board = conn.execute(
            "SELECT favorite FROM boards WHERE id = ? AND user_id = ?",
            (board_id, user["id"]),
        ).fetchone()
        if not board:
            return False
        new_val = 0 if board["favorite"] else 1
        conn.execute(
            "UPDATE boards SET favorite = ? WHERE id = ? AND user_id = ?",
            (new_val, board_id, user["id"]),
        )
        conn.commit()
        return True
    finally:
        conn.close()


def update_board_description(board_id: str, description: str, username: str) -> bool:
    conn = get_connection()
    try:
        user = conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
        if not user:
            return False
        cur = conn.execute(
            "UPDATE boards SET description = ? WHERE id = ? AND user_id = ?",
            (description, board_id, user["id"]),
        )
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()


def apply_board_update(board_data: dict, username: str) -> dict:
    """Apply a full board update from the AI, preserving card metadata."""
    conn = get_connection()
    try:
        bid = board_id_for_user(conn, username)
        if not bid:
            return {}

        conn.execute("BEGIN IMMEDIATE")

        # Snapshot existing card metadata before deleting
        existing_cards = {}
        rows = conn.execute(
            """SELECT id, priority, due_date, labels FROM cards
               WHERE column_id IN (SELECT id FROM columns WHERE board_id = ?)""",
            (bid,),
        ).fetchall()
        for r in rows:
            existing_cards[r["id"]] = {
                "priority": r["priority"],
                "due_date": r["due_date"],
                "labels": r["labels"],
            }

        conn.execute("DELETE FROM cards WHERE column_id IN (SELECT id FROM columns WHERE board_id = ?)", (bid,))
        conn.execute("DELETE FROM columns WHERE board_id = ?", (bid,))

        preserved_count = 0
        for col in board_data.get("columns", []):
            conn.execute(
                "INSERT INTO columns (id, board_id, title, position) VALUES (?, ?, ?, ?)",
                (col["id"], bid, col["title"], col.get("position", 0)),
            )
            for card in col.get("cards", []):
                meta = existing_cards.get(card["id"], {})
                priority = card.get("priority", meta.get("priority", "none"))
                due_date = card.get("due_date", meta.get("due_date"))
                labels = card.get("labels", meta.get("labels", ""))
                if card["id"] in existing_cards:
                    preserved_count += 1
                conn.execute(
                    "INSERT INTO cards (id, column_id, title, details, position, priority, due_date, labels) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    (card["id"], col["id"], card["title"], card.get("details", ""), card.get("position", 0), priority, due_date, labels),
                )
        conn.commit()
        return {"preserved_cards": preserved_count}
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
