from app.db.connection import get_connection


def get_board_statistics(board_id: str, username: str) -> dict | None:
    conn = get_connection()
    try:
        # Verify access
        user = conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
        if not user:
            return None
        board = conn.execute("SELECT id, title FROM boards WHERE id = ?", (board_id,)).fetchone()
        if not board:
            return None

        # Cards by column
        columns = conn.execute(
            """SELECT c.id, c.title, COUNT(ca.id) as card_count
               FROM columns c LEFT JOIN cards ca ON c.id = ca.column_id
               WHERE c.board_id = ?
               GROUP BY c.id ORDER BY c.position""",
            (board_id,),
        ).fetchall()

        # Cards by priority
        priority_rows = conn.execute(
            """SELECT priority, COUNT(*) as count FROM cards
               WHERE column_id IN (SELECT id FROM columns WHERE board_id = ?)
               GROUP BY priority""",
            (board_id,),
        ).fetchall()

        # Total cards
        total = conn.execute(
            "SELECT COUNT(*) as cnt FROM cards WHERE column_id IN (SELECT id FROM columns WHERE board_id = ?)",
            (board_id,),
        ).fetchone()["cnt"]

        # Completion rate (cards in last column)
        last_col = conn.execute(
            "SELECT id FROM columns WHERE board_id = ? ORDER BY position DESC LIMIT 1",
            (board_id,),
        ).fetchone()
        completed = 0
        if last_col:
            row = conn.execute("SELECT COUNT(*) as cnt FROM cards WHERE column_id = ?", (last_col["id"],)).fetchone()
            completed = row["cnt"]
        completion_rate = round(completed / total * 100, 1) if total > 0 else 0

        # Overdue count
        overdue = conn.execute(
            """SELECT COUNT(*) as cnt FROM cards
               WHERE column_id IN (SELECT id FROM columns WHERE board_id = ?)
               AND due_date IS NOT NULL AND due_date < date('now')""",
            (board_id,),
        ).fetchone()["cnt"]

        # Story points
        sp_total = conn.execute(
            """SELECT COALESCE(SUM(story_points), 0) as total FROM cards
               WHERE column_id IN (SELECT id FROM columns WHERE board_id = ?)""",
            (board_id,),
        ).fetchone()["total"]
        sp_completed = 0
        if last_col:
            row = conn.execute(
                "SELECT COALESCE(SUM(story_points), 0) as total FROM cards WHERE column_id = ?",
                (last_col["id"],),
            ).fetchone()
            sp_completed = row["total"]

        # Time tracking
        est_hours = conn.execute(
            """SELECT COALESCE(SUM(estimated_hours), 0) as total FROM cards
               WHERE column_id IN (SELECT id FROM columns WHERE board_id = ?)""",
            (board_id,),
        ).fetchone()["total"]
        actual_hours = conn.execute(
            """SELECT COALESCE(SUM(actual_hours), 0) as total FROM cards
               WHERE column_id IN (SELECT id FROM columns WHERE board_id = ?)""",
            (board_id,),
        ).fetchone()["total"]

        # Cards created this week
        this_week = conn.execute(
            """SELECT COUNT(*) as cnt FROM cards
               WHERE column_id IN (SELECT id FROM columns WHERE board_id = ?)
               AND created_at >= datetime('now', '-7 days')""",
            (board_id,),
        ).fetchone()["cnt"]

        return {
            "total_cards": total,
            "cards_by_column": [dict(r) for r in columns],
            "cards_by_priority": {r["priority"]: r["count"] for r in priority_rows},
            "completion_rate": completion_rate,
            "overdue_count": overdue,
            "total_story_points": sp_total,
            "completed_story_points": sp_completed,
            "total_estimated_hours": est_hours,
            "total_actual_hours": actual_hours,
            "cards_created_this_week": this_week,
        }
    finally:
        conn.close()


def get_velocity_metrics(board_id: str, username: str, period: str = "week") -> list[dict]:
    conn = get_connection()
    try:
        # Count cards moved to last column per period from activity log
        last_col = conn.execute(
            "SELECT id FROM columns WHERE board_id = ? ORDER BY position DESC LIMIT 1",
            (board_id,),
        ).fetchone()
        if not last_col:
            return []

        # Get activity for "moved" actions to the last column in last 8 weeks
        rows = conn.execute(
            """SELECT date(created_at) as day, COUNT(*) as count
               FROM activity_log
               WHERE board_id = ? AND action LIKE '%moved%' AND details LIKE ?
               AND created_at >= datetime('now', '-56 days')
               GROUP BY date(created_at)
               ORDER BY day""",
            (board_id, f"%{last_col['id']}%"),
        ).fetchall()

        # Group by week
        weeks = {}
        for r in rows:
            from datetime import datetime
            dt = datetime.strptime(r["day"], "%Y-%m-%d")
            week_start = dt - __import__("datetime").timedelta(days=dt.weekday())
            week_key = week_start.strftime("%Y-%m-%d")
            weeks[week_key] = weeks.get(week_key, 0) + r["count"]

        return [{"week": k, "cards_completed": v} for k, v in sorted(weeks.items())]
    finally:
        conn.close()


def get_user_dashboard(username: str) -> dict:
    conn = get_connection()
    try:
        user = conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
        if not user:
            return {}

        # Total boards
        total_boards = conn.execute(
            "SELECT COUNT(*) as cnt FROM boards WHERE user_id = ? AND archived = 0",
            (user["id"],),
        ).fetchone()["cnt"]

        # Member boards
        member_boards = conn.execute(
            "SELECT COUNT(DISTINCT board_id) as cnt FROM board_members WHERE user_id = ?",
            (user["id"],),
        ).fetchone()["cnt"]

        # Overdue cards across all boards
        overdue = conn.execute(
            """SELECT c.id, c.title, c.due_date, b.id as board_id, b.title as board_title
               FROM cards c
               JOIN columns col ON c.column_id = col.id
               JOIN boards b ON col.board_id = b.id
               LEFT JOIN board_members bm ON b.id = bm.board_id AND bm.user_id = ?
               WHERE (b.user_id = ? OR bm.user_id = ?) AND b.archived = 0
               AND c.due_date IS NOT NULL AND c.due_date < date('now')
               ORDER BY c.due_date LIMIT 20""",
            (user["id"], user["id"], user["id"]),
        ).fetchall()

        # Recently active boards
        recent = conn.execute(
            """SELECT b.id, b.title, b.updated_at FROM boards b
               WHERE b.user_id = ? AND b.archived = 0 AND b.updated_at IS NOT NULL
               ORDER BY b.updated_at DESC LIMIT 5""",
            (user["id"],),
        ).fetchall()

        # Cards assigned to me
        assigned = conn.execute(
            """SELECT COUNT(DISTINCT ca.card_id) as cnt FROM card_assignees ca
               JOIN cards c ON ca.card_id = c.id
               JOIN columns col ON c.column_id = col.id
               JOIN boards b ON col.board_id = b.id
               WHERE ca.user_id = ? AND b.archived = 0""",
            (user["id"],),
        ).fetchone()["cnt"]

        # Total cards across boards
        total_cards = conn.execute(
            """SELECT COUNT(c.id) as cnt FROM cards c
               JOIN columns col ON c.column_id = col.id
               JOIN boards b ON col.board_id = b.id
               WHERE b.user_id = ? AND b.archived = 0""",
            (user["id"],),
        ).fetchone()["cnt"]

        return {
            "total_boards": total_boards + member_boards,
            "total_cards": total_cards,
            "overdue_cards": [dict(r) for r in overdue],
            "recently_active_boards": [dict(r) for r in recent],
            "cards_assigned_to_me": assigned,
        }
    finally:
        conn.close()
