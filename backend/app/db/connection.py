import sqlite3
import os
from pathlib import Path

DB_PATH = os.environ.get("DB_PATH", str(Path(__file__).parent.parent.parent / "data" / "pm.db"))


def get_connection() -> sqlite3.Connection:
    Path(DB_PATH).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    return conn


def init_db() -> None:
    conn = get_connection()
    try:
        schema = (Path(__file__).parent / "schema.sql").read_text()
        conn.executescript(schema)
        conn.commit()
    finally:
        conn.close()


def seed_db_if_empty() -> None:
    conn = get_connection()
    try:
        count = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
        if count == 0:
            seed = (Path(__file__).parent / "seed.sql").read_text()
            conn.executescript(seed)
            conn.commit()
    finally:
        conn.close()


def ensure_db() -> None:
    init_db()
    seed_db_if_empty()


def board_id_for_user(conn: sqlite3.Connection, username: str) -> str | None:
    row = conn.execute(
        """SELECT b.id FROM boards b
           JOIN users u ON b.user_id = u.id
           WHERE u.username = ?""",
        (username,),
    ).fetchone()
    return row["id"] if row else None


def user_owns_column(conn: sqlite3.Connection, column_id: str, username: str) -> bool:
    row = conn.execute(
        """SELECT 1 FROM columns c
           JOIN boards b ON c.board_id = b.id
           JOIN users u ON b.user_id = u.id
           WHERE c.id = ? AND u.username = ?""",
        (column_id, username),
    ).fetchone()
    return row is not None


def user_owns_card(conn: sqlite3.Connection, card_id: str, username: str) -> bool:
    row = conn.execute(
        """SELECT 1 FROM cards ca
           JOIN columns c ON ca.column_id = c.id
           JOIN boards b ON c.board_id = b.id
           JOIN users u ON b.user_id = u.id
           WHERE ca.id = ? AND u.username = ?""",
        (card_id, username),
    ).fetchone()
    return row is not None
