import os

from app.db.connection import get_connection


def create_milestone(board_id: str, name: str, description: str, due_date: str | None, username: str) -> dict | None:
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
            member = conn.execute(
                """SELECT bm.role FROM board_members bm
                   WHERE bm.board_id = ? AND bm.user_id = ?""",
                (board_id, user["id"]),
            ).fetchone()
            if not member or member["role"] not in ("owner", "editor"):
                return None
        milestone_id = f"mile-{os.urandom(4).hex()}"
        conn.execute(
            "INSERT INTO milestones (id, board_id, name, description, due_date) VALUES (?, ?, ?, ?, ?)",
            (milestone_id, board_id, name, description, due_date),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM milestones WHERE id = ?", (milestone_id,)).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def get_milestones(board_id: str, username: str) -> list[dict]:
    conn = get_connection()
    try:
        user = conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
        if not user:
            return []
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
            "SELECT * FROM milestones WHERE board_id = ? ORDER BY created_at",
            (board_id,),
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def update_milestone(milestone_id: str, name: str | None, description: str | None, due_date: str | None, status: str | None, username: str) -> bool:
    conn = get_connection()
    try:
        user = conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
        if not user:
            return False
        milestone = conn.execute("SELECT board_id FROM milestones WHERE id = ?", (milestone_id,)).fetchone()
        if not milestone:
            return False
        board_id = milestone["board_id"]
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
        if description is not None:
            sets.append("description = ?")
            params.append(description)
        if due_date is not None:
            sets.append("due_date = ?")
            params.append(due_date)
        if status is not None:
            sets.append("status = ?")
            params.append(status)
        if not sets:
            return False
        params.append(milestone_id)
        cur = conn.execute(f"UPDATE milestones SET {', '.join(sets)} WHERE id = ?", params)
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()


def delete_milestone(milestone_id: str, username: str) -> bool:
    conn = get_connection()
    try:
        user = conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
        if not user:
            return False
        milestone = conn.execute("SELECT board_id FROM milestones WHERE id = ?", (milestone_id,)).fetchone()
        if not milestone:
            return False
        board_id = milestone["board_id"]
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
        cur = conn.execute("DELETE FROM milestones WHERE id = ?", (milestone_id,))
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()
