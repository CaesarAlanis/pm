import os

from app.db.connection import get_connection


def add_board_member(board_id: str, username: str, role: str = "editor", inviter_username: str = "") -> dict | None:
    conn = get_connection()
    try:
        # Check inviter is owner
        if inviter_username:
            board = conn.execute(
                """SELECT b.id FROM boards b JOIN users u ON b.user_id = u.id
                   WHERE b.id = ? AND u.username = ?""",
                (board_id, inviter_username),
            ).fetchone()
            if not board:
                return None

        user = conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
        if not user:
            return None

        # Check not already a member
        existing = conn.execute(
            "SELECT 1 FROM board_members WHERE board_id = ? AND user_id = ?",
            (board_id, user["id"]),
        ).fetchone()
        if existing:
            return None

        conn.execute(
            "INSERT INTO board_members (board_id, user_id, role) VALUES (?, ?, ?)",
            (board_id, user["id"], role),
        )
        conn.commit()
        return {"board_id": board_id, "username": username, "role": role}
    finally:
        conn.close()


def remove_board_member(board_id: str, username: str, remover_username: str = "") -> bool:
    conn = get_connection()
    try:
        if remover_username:
            board = conn.execute(
                """SELECT b.id FROM boards b JOIN users u ON b.user_id = u.id
                   WHERE b.id = ? AND u.username = ?""",
                (board_id, remover_username),
            ).fetchone()
            if not board:
                return False

        user = conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
        if not user:
            return False

        cur = conn.execute(
            "DELETE FROM board_members WHERE board_id = ? AND user_id = ?",
            (board_id, user["id"]),
        )
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()


def get_board_members(board_id: str) -> list[dict]:
    conn = get_connection()
    try:
        rows = conn.execute(
            """SELECT u.username, bm.role, bm.joined_at
               FROM board_members bm
               JOIN users u ON bm.user_id = u.id
               WHERE bm.board_id = ?
               ORDER BY bm.joined_at""",
            (board_id,),
        ).fetchall()
        # Also include the board owner
        owner = conn.execute(
            """SELECT u.username, 'owner' as role, b.created_at as joined_at
               FROM boards b JOIN users u ON b.user_id = u.id
               WHERE b.id = ?""",
            (board_id,),
        ).fetchone()
        members = [dict(r) for r in rows]
        if owner:
            members.insert(0, dict(owner))
        return members
    finally:
        conn.close()


def user_can_access_board(board_id: str, username: str, min_role: str = "viewer") -> bool:
    conn = get_connection()
    try:
        # Owner always has access
        board = conn.execute(
            """SELECT b.id FROM boards b JOIN users u ON b.user_id = u.id
               WHERE b.id = ? AND u.username = ?""",
            (board_id, username),
        ).fetchone()
        if board:
            return True

        # Check membership
        role_order = {"viewer": 0, "editor": 1, "owner": 2}
        row = conn.execute(
            """SELECT bm.role FROM board_members bm
               JOIN users u ON bm.user_id = u.id
               WHERE bm.board_id = ? AND u.username = ?""",
            (board_id, username),
        ).fetchone()
        if not row:
            return False
        return role_order.get(row["role"], 0) >= role_order.get(min_role, 0)
    finally:
        conn.close()


def log_activity(board_id: str, username: str, action: str, details: str = "") -> None:
    conn = get_connection()
    try:
        user = conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
        if not user:
            return
        act_id = f"act-{os.urandom(6).hex()}"
        conn.execute(
            "INSERT INTO activity_log (id, board_id, user_id, action, details) VALUES (?, ?, ?, ?, ?)",
            (act_id, board_id, user["id"], action, details),
        )
        conn.commit()
    finally:
        conn.close()


def get_activity_log(board_id: str, limit: int = 50) -> list[dict]:
    conn = get_connection()
    try:
        rows = conn.execute(
            """SELECT a.id, u.username, a.action, a.details, a.created_at
               FROM activity_log a
               JOIN users u ON a.user_id = u.id
               WHERE a.board_id = ?
               ORDER BY a.created_at DESC
               LIMIT ?""",
            (board_id, limit),
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()
