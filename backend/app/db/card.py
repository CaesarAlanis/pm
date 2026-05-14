from app.db.connection import get_connection, user_owns_column, user_owns_card, user_can_access_card, user_can_access_board, get_board_id_for_column, get_board_id_for_card


def user_can_edit_card(conn, card_id: str, username: str) -> bool:
    if user_owns_card(conn, card_id, username):
        return True
    board_id = get_board_id_for_card(conn, card_id)
    if board_id and user_can_access_board(conn, board_id, username, min_role="editor"):
        return True
    return False


def user_can_edit_column(conn, column_id: str, username: str) -> bool:
    if user_owns_column(conn, column_id, username):
        return True
    board_id = get_board_id_for_column(conn, column_id)
    if board_id and user_can_access_board(conn, board_id, username, min_role="editor"):
        return True
    return False


def add_card(column_id: str, card_id: str, title: str, details: str, username: str, priority: str = "none", due_date: str | None = None, labels: str = "", story_points: int | None = None, estimated_hours: float | None = None, card_type: str = "task") -> bool:
    conn = get_connection()
    try:
        if not user_can_edit_column(conn, column_id, username):
            return False
        max_pos = conn.execute(
            "SELECT COALESCE(MAX(position), -1) FROM cards WHERE column_id = ?", (column_id,)
        ).fetchone()[0]
        conn.execute(
            "INSERT INTO cards (id, column_id, title, details, position, priority, due_date, labels, story_points, estimated_hours, card_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (card_id, column_id, title, details, max_pos + 1, priority, due_date, labels, story_points, estimated_hours, card_type),
        )
        conn.commit()
        return True
    finally:
        conn.close()


def update_card(card_id: str, title: str | None, details: str | None, username: str, priority: str | None = None, due_date: str | None = None, labels: str | None = None, story_points: int | None = ..., estimated_hours: float | None = ..., card_type: str | None = None) -> bool:
    conn = get_connection()
    try:
        if not user_can_edit_card(conn, card_id, username):
            return False
        sets = []
        params = []
        if title is not None:
            sets.append("title = ?")
            params.append(title)
        if details is not None:
            sets.append("details = ?")
            params.append(details)
        if priority is not None:
            sets.append("priority = ?")
            params.append(priority)
        if due_date is not None:
            sets.append("due_date = ?")
            params.append(due_date)
        if labels is not None:
            sets.append("labels = ?")
            params.append(labels)
        # Use ... as sentinel to distinguish "not provided" from None
        if story_points is not ...:
            sets.append("story_points = ?")
            params.append(story_points)
        if estimated_hours is not ...:
            sets.append("estimated_hours = ?")
            params.append(estimated_hours)
        if card_type is not None:
            sets.append("card_type = ?")
            params.append(card_type)
        if not sets:
            return False
        params.append(card_id)
        cur = conn.execute(f"UPDATE cards SET {', '.join(sets)} WHERE id = ?", params)
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()


def delete_card(card_id: str, username: str) -> bool:
    conn = get_connection()
    try:
        if not user_can_edit_card(conn, card_id, username):
            return False
        cur = conn.execute("DELETE FROM cards WHERE id = ?", (card_id,))
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()


def move_card(card_id: str, target_column_id: str, target_position: int, username: str) -> bool:
    conn = get_connection()
    try:
        if not user_can_edit_card(conn, card_id, username):
            return False
        if not user_can_edit_column(conn, target_column_id, username):
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

        # Move card to sentinel position first to avoid position collisions
        conn.execute(
            "UPDATE cards SET column_id = ?, position = -1 WHERE id = ?",
            (src_col, card_id),
        )

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


def search_cards(board_id: str, username: str, assignee: str | None = None, card_type: str | None = None, priority: str | None = None, due_before: str | None = None, due_after: str | None = None) -> list[dict]:
    conn = get_connection()
    try:
        from app.db.connection import user_can_access_board
        if not user_can_access_board(conn, board_id, username):
            return []
        conditions = ["c.board_id = ?"]
        params: list = [board_id]
        if assignee is not None:
            conditions.append("""ca.id IN (
                SELECT card_id FROM card_assignees ca2
                JOIN users u ON ca2.user_id = u.id
                WHERE u.username = ?
            )""")
            params.append(assignee)
        if card_type is not None:
            conditions.append("ca.card_type = ?")
            params.append(card_type)
        if priority is not None:
            conditions.append("ca.priority = ?")
            params.append(priority)
        if due_before is not None:
            conditions.append("ca.due_date <= ?")
            params.append(due_before)
        if due_after is not None:
            conditions.append("ca.due_date >= ?")
            params.append(due_after)
        where = " AND ".join(conditions)
        rows = conn.execute(
            f"""SELECT ca.id, ca.column_id, ca.title, ca.details, ca.position,
                       ca.priority, ca.due_date, ca.labels, ca.story_points,
                       ca.estimated_hours, ca.actual_hours, ca.card_type, ca.sprint_id,
                       c.title AS column_title
                FROM cards ca
                JOIN columns c ON ca.column_id = c.id
                WHERE {where}
                ORDER BY ca.position""",
            params,
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()
