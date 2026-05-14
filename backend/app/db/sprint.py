import os

from app.db.connection import get_connection


def create_sprint(board_id: str, name: str, goal: str, start_date: str | None, end_date: str | None, username: str) -> dict | None:
    conn = get_connection()
    try:
        user = conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
        if not user:
            return None
        board = conn.execute(
            "SELECT id FROM boards WHERE id = ? AND user_id = ?",
            (board_id, user["id"]),
        ).fetchone()
        if not board:
            # Check if user is a board member with editor role
            member = conn.execute(
                """SELECT bm.role FROM board_members bm
                   WHERE bm.board_id = ? AND bm.user_id = ?""",
                (board_id, user["id"]),
            ).fetchone()
            if not member or member["role"] not in ("owner", "editor"):
                return None
        sprint_id = f"sprint-{os.urandom(4).hex()}"
        conn.execute(
            "INSERT INTO sprints (id, board_id, name, goal, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?)",
            (sprint_id, board_id, name, goal, start_date, end_date),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM sprints WHERE id = ?", (sprint_id,)).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def get_sprints(board_id: str, username: str) -> list[dict]:
    conn = get_connection()
    try:
        user = conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
        if not user:
            return []
        # Check access
        board = conn.execute(
            "SELECT id FROM boards WHERE id = ? AND user_id = ?",
            (board_id, user["id"]),
        ).fetchone()
        if not board:
            member = conn.execute(
                """SELECT 1 FROM board_members
                   WHERE board_id = ? AND user_id = ?""",
                (board_id, user["id"]),
            ).fetchone()
            if not member:
                return []
        rows = conn.execute(
            "SELECT * FROM sprints WHERE board_id = ? ORDER BY created_at",
            (board_id,),
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def get_sprint(sprint_id: str, username: str) -> dict | None:
    conn = get_connection()
    try:
        user = conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
        if not user:
            return None
        sprint = conn.execute("SELECT * FROM sprints WHERE id = ?", (sprint_id,)).fetchone()
        if not sprint:
            return None
        # Check access to the board
        board_id = sprint["board_id"]
        board = conn.execute(
            "SELECT id FROM boards WHERE id = ? AND user_id = ?",
            (board_id, user["id"]),
        ).fetchone()
        if not board:
            member = conn.execute(
                """SELECT 1 FROM board_members
                   WHERE board_id = ? AND user_id = ?""",
                (board_id, user["id"]),
            ).fetchone()
            if not member:
                return None
        return dict(sprint)
    finally:
        conn.close()


def update_sprint(sprint_id: str, name: str | None, goal: str | None, start_date: str | None, end_date: str | None, status: str | None, username: str) -> bool:
    conn = get_connection()
    try:
        user = conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
        if not user:
            return False
        sprint = conn.execute("SELECT board_id FROM sprints WHERE id = ?", (sprint_id,)).fetchone()
        if not sprint:
            return False
        board_id = sprint["board_id"]
        # Check ownership or editor access
        board = conn.execute(
            "SELECT id FROM boards WHERE id = ? AND user_id = ?",
            (board_id, user["id"]),
        ).fetchone()
        if not board:
            member = conn.execute(
                """SELECT bm.role FROM board_members bm
                   WHERE bm.board_id = ? AND bm.user_id = ?""",
                (board_id, user["id"]),
            ).fetchone()
            if not member or member["role"] not in ("owner", "editor"):
                return False
        sets = []
        params = []
        if name is not None:
            sets.append("name = ?")
            params.append(name)
        if goal is not None:
            sets.append("goal = ?")
            params.append(goal)
        if start_date is not None:
            sets.append("start_date = ?")
            params.append(start_date)
        if end_date is not None:
            sets.append("end_date = ?")
            params.append(end_date)
        if status is not None:
            sets.append("status = ?")
            params.append(status)
        if not sets:
            return False
        params.append(sprint_id)
        cur = conn.execute(f"UPDATE sprints SET {', '.join(sets)} WHERE id = ?", params)
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()


def assign_card_to_sprint(card_id: str, sprint_id: str, username: str) -> bool:
    conn = get_connection()
    try:
        if not user_can_edit_sprint_card(conn, card_id, username):
            return False
        # Verify sprint exists
        sprint = conn.execute("SELECT id FROM sprints WHERE id = ?", (sprint_id,)).fetchone()
        if not sprint:
            return False
        cur = conn.execute(
            "UPDATE cards SET sprint_id = ? WHERE id = ?",
            (sprint_id, card_id),
        )
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()


def remove_card_from_sprint(card_id: str, username: str) -> bool:
    conn = get_connection()
    try:
        if not user_can_edit_sprint_card(conn, card_id, username):
            return False
        cur = conn.execute(
            "UPDATE cards SET sprint_id = NULL WHERE id = ?",
            (card_id,),
        )
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()


def user_can_edit_sprint_card(conn, card_id: str, username: str) -> bool:
    from app.db.connection import user_owns_card, user_can_access_board, get_board_id_for_card
    if user_owns_card(conn, card_id, username):
        return True
    board_id = get_board_id_for_card(conn, card_id)
    if board_id and user_can_access_board(conn, board_id, username, min_role="editor"):
        return True
    return False
