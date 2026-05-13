import sqlite3
import os
from pathlib import Path

from app.session import get_user

DB_PATH = os.environ.get("DB_PATH", str(Path(__file__).parent.parent / "data" / "pm.db"))


def _connect() -> sqlite3.Connection:
    Path(DB_PATH).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    conn = _connect()
    try:
        schema = (Path(__file__).parent / "db" / "schema.sql").read_text()
        conn.executescript(schema)
        conn.commit()
    finally:
        conn.close()


def seed_db_if_empty() -> None:
    conn = _connect()
    try:
        count = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
        if count == 0:
            seed = (Path(__file__).parent / "db" / "seed.sql").read_text()
            conn.executescript(seed)
            conn.commit()
    finally:
        conn.close()


def ensure_db() -> None:
    init_db()
    seed_db_if_empty()


def get_board(username: str) -> dict | None:
    conn = _connect()
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


def rename_column(column_id: str, title: str) -> bool:
    conn = _connect()
    try:
        cur = conn.execute("UPDATE columns SET title = ? WHERE id = ?", (title, column_id))
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()


def add_card(column_id: str, card_id: str, title: str, details: str) -> bool:
    conn = _connect()
    try:
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


def update_card(card_id: str, title: str | None, details: str | None) -> bool:
    conn = _connect()
    try:
        sets = []
        params = []
        if title is not None:
            sets.append("title = ?")
            params.append(title)
        if details is not None:
            sets.append("details = ?")
            params.append(details)
        if not sets:
            return False
        params.append(card_id)
        cur = conn.execute(f"UPDATE cards SET {', '.join(sets)} WHERE id = ?", params)
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()


def delete_card(card_id: str) -> bool:
    conn = _connect()
    try:
        cur = conn.execute("DELETE FROM cards WHERE id = ?", (card_id,))
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()


def move_card(card_id: str, target_column_id: str, target_position: int) -> bool:
    conn = _connect()
    try:
        card = conn.execute("SELECT column_id, position FROM cards WHERE id = ?", (card_id,)).fetchone()
        if not card:
            return False

        src_col = card["column_id"]
        src_pos = card["position"]

        if src_col == target_column_id and src_pos == target_position:
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
    finally:
        conn.close()


def get_username_by_token(token: str) -> str | None:
    return get_user(token)


def apply_board_update(board_data: dict) -> None:
    """Apply a full board update from the AI, replacing columns and cards."""
    conn = _connect()
    try:
        # Get the single board (MVP: one board)
        board = conn.execute("SELECT id FROM boards LIMIT 1").fetchone()
        if not board:
            return
        board_id = board["id"]

        # Clear existing cards and columns
        conn.execute("DELETE FROM cards WHERE column_id IN (SELECT id FROM columns WHERE board_id = ?)", (board_id,))
        conn.execute("DELETE FROM columns WHERE board_id = ?", (board_id,))

        # Insert updated columns and cards
        for col in board_data.get("columns", []):
            conn.execute(
                "INSERT INTO columns (id, board_id, title, position) VALUES (?, ?, ?, ?)",
                (col["id"], board_id, col["title"], col.get("position", 0)),
            )
            for card in col.get("cards", []):
                conn.execute(
                    "INSERT INTO cards (id, column_id, title, details, position) VALUES (?, ?, ?, ?, ?)",
                    (card["id"], col["id"], card["title"], card.get("details", ""), card.get("position", 0)),
                )
        conn.commit()
    finally:
        conn.close()
