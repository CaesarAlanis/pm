import sqlite3
from pathlib import Path
from typing import Any

DB_PATH = Path(__file__).resolve().parent.parent / "pm.sqlite"


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    conn = get_connection()
    try:
        conn.executescript(
            """
            DROP TABLE IF EXISTS cards;
            DROP TABLE IF EXISTS columns;
            DROP TABLE IF EXISTS boards;
            DROP TABLE IF EXISTS users;

            CREATE TABLE users (
                id TEXT PRIMARY KEY,
                username TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE TABLE boards (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL UNIQUE REFERENCES users(id),
                title TEXT NOT NULL DEFAULT 'Project Board',
                created_at TEXT NOT NULL
            );

            CREATE TABLE columns (
                id TEXT PRIMARY KEY,
                board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
                position INTEGER NOT NULL,
                title TEXT NOT NULL
            );

            CREATE TABLE cards (
                id TEXT PRIMARY KEY,
                board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
                column_id TEXT NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
                position INTEGER NOT NULL,
                title TEXT NOT NULL,
                details TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL
            );
            """
        )
        conn.commit()
    finally:
        conn.close()


def ensure_seed_data() -> None:
    conn = get_connection()
    try:
        existing_tables = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('users', 'boards', 'columns', 'cards')"
        ).fetchall()
        if len(existing_tables) != 4:
            conn.close()
            init_db()
            return

        user_row = conn.execute(
            "SELECT id FROM users WHERE username = ?",
            ("user",),
        ).fetchone()
        if user_row is not None:
            return

        user_id = "user-1"
        conn.execute(
            "INSERT INTO users (id, username, password_hash, created_at) VALUES (?, ?, ?, datetime('now'))",
            (user_id, "user", "demo-password"),
        )
        board_id = "board-1"
        conn.execute(
            "INSERT INTO boards (id, user_id, title, created_at) VALUES (?, ?, ?, datetime('now'))",
            (board_id, user_id, "Project Board"),
        )
        columns = [
            ("col-1", "Backlog", 0),
            ("col-2", "Discovery", 1),
            ("col-3", "In Progress", 2),
            ("col-4", "Review", 3),
            ("col-5", "Done", 4),
        ]
        for column_id, title, position in columns:
            conn.execute(
                "INSERT INTO columns (id, board_id, position, title) VALUES (?, ?, ?, ?)",
                (column_id, board_id, position, title),
            )
        column_ids = [column_id for column_id, _, _ in columns]
        cards = [
            ("card-1", column_ids[0], 0, "Align roadmap themes", "Draft quarterly themes with impact statements and metrics."),
            ("card-2", column_ids[0], 1, "Gather customer signals", "Review support tags, sales notes, and churn feedback."),
            ("card-3", column_ids[1], 0, "Prototype analytics view", "Sketch initial dashboard layout and key drill-downs."),
            ("card-4", column_ids[2], 0, "Refine status language", "Standardize column labels and tone across the board."),
            ("card-5", column_ids[2], 1, "Design card layout", "Add hierarchy and spacing for scanning dense lists."),
            ("card-6", column_ids[3], 0, "QA micro-interactions", "Verify hover, focus, and loading states."),
            ("card-7", column_ids[4], 0, "Ship marketing page", "Final copy approved and asset pack delivered."),
            ("card-8", column_ids[4], 1, "Close onboarding sprint", "Document release notes and share internally."),
        ]
        for card_id, column_id, position, title, details in cards:
            conn.execute(
                "INSERT INTO cards (id, board_id, column_id, position, title, details, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))",
                (card_id, board_id, column_id, position, title, details),
            )
        conn.commit()
    finally:
        conn.close()


def get_board_state(username: str) -> dict[str, Any]:
    ensure_seed_data()
    conn = get_connection()
    try:
        user_row = conn.execute(
            "SELECT id FROM users WHERE username = ?",
            (username,),
        ).fetchone()
        if user_row is None:
            raise ValueError("User not found")

        board_row = conn.execute(
            "SELECT id, title FROM boards WHERE user_id = ?",
            (user_row["id"],),
        ).fetchone()
        if board_row is None:
            raise ValueError("Board not found")

        columns = conn.execute(
            "SELECT id, title FROM columns WHERE board_id = ? ORDER BY position ASC",
            (board_row["id"],),
        ).fetchall()
        cards = conn.execute(
            "SELECT id, column_id, title, details FROM cards WHERE board_id = ? ORDER BY position ASC",
            (board_row["id"],),
        ).fetchall()

        card_map: dict[str, dict[str, Any]] = {}
        for card in cards:
            card_map[str(card["id"])] = {
                "id": str(card["id"]),
                "title": card["title"],
                "details": card["details"],
            }

        column_list: list[dict[str, Any]] = []
        for column in columns:
            column_card_ids = [
                str(card["id"])
                for card in cards
                if card["column_id"] == column["id"]
            ]
            column_list.append(
                {
                    "id": str(column["id"]),
                    "title": column["title"],
                    "cardIds": column_card_ids,
                }
            )

        return {"columns": column_list, "cards": card_map}
    finally:
        conn.close()


def replace_board_state(username: str, board_data: dict[str, Any] | Any) -> dict[str, Any]:
    ensure_seed_data()
    conn = get_connection()
    try:
        user_row = conn.execute(
            "SELECT id FROM users WHERE username = ?",
            (username,),
        ).fetchone()
        if user_row is None:
            raise ValueError("User not found")

        board_row = conn.execute(
            "SELECT id FROM boards WHERE user_id = ?",
            (user_row["id"],),
        ).fetchone()
        if board_row is None:
            raise ValueError("Board not found")

        board_id = board_row["id"]
        conn.execute("DELETE FROM cards WHERE board_id = ?", (board_id,))
        conn.execute("DELETE FROM columns WHERE board_id = ?", (board_id,))
        conn.commit()

        if hasattr(board_data, "model_dump"):
            board_data = board_data.model_dump()
        elif not isinstance(board_data, dict):
            board_data = dict(board_data)

        columns = board_data.get("columns", [])
        cards = board_data.get("cards", {})

        for position, column in enumerate(columns):
            column_dict = column if isinstance(column, dict) else {}
            column_id = str(column_dict.get("id") or f"col-{position + 1}")
            conn.execute(
                "INSERT INTO columns (id, board_id, position, title) VALUES (?, ?, ?, ?)",
                (column_id, board_id, position, column_dict.get("title", "Untitled")),
            )
            card_ids = column_dict.get("cardIds", [])
            for card_position, card_id in enumerate(card_ids):
                card = cards.get(card_id)
                if card is None:
                    continue
                card_dict = card if isinstance(card, dict) else {}
                conn.execute(
                    "INSERT INTO cards (id, board_id, column_id, position, title, details, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))",
                    (
                        str(card_id),
                        board_id,
                        column_id,
                        card_position,
                        card_dict.get("title", "Untitled"),
                        card_dict.get("details", ""),
                    ),
                )

        conn.commit()
        return get_board_state(username)
    finally:
        conn.close()
