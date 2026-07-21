import os
import sqlite3
import uuid
from typing import Dict, Any, List

DB_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data"))
DB_PATH = os.path.join(DB_DIR, "app.db")

def get_db_connection(db_path: str = DB_PATH):
    if db_path != ":memory:":
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

def init_db(db_path: str = DB_PATH):
    conn = get_db_connection(db_path)
    cursor = conn.cursor()

    # Create Users table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # Create Boards table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS boards (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )
    """)

    # Create Columns table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS columns (
        id TEXT PRIMARY KEY,
        board_id TEXT NOT NULL,
        title TEXT NOT NULL,
        position INTEGER NOT NULL,
        FOREIGN KEY (board_id) REFERENCES boards (id)
    )
    """)

    # Create Cards table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS cards (
        id TEXT PRIMARY KEY,
        column_id TEXT NOT NULL,
        title TEXT NOT NULL,
        details TEXT NOT NULL,
        position INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (column_id) REFERENCES columns (id)
    )
    """)

    # Seed default MVP user
    cursor.execute("SELECT id FROM users WHERE username = 'user'")
    user_row = cursor.fetchone()
    if not user_row:
        user_id = "user-1"
        cursor.execute(
            "INSERT INTO users (id, username, password) VALUES (?, ?, ?)",
            (user_id, "user", "password")
        )
    else:
        user_id = user_row["id"]

    # Seed default board for user if missing
    cursor.execute("SELECT id FROM boards WHERE user_id = ?", (user_id,))
    board_row = cursor.fetchone()
    if not board_row:
        board_id = "board-user-1"
        cursor.execute(
            "INSERT INTO boards (id, user_id, title) VALUES (?, ?, ?)",
            (board_id, user_id, "Kanban Studio")
        )

        # Default columns
        default_columns = [
            ("col-backlog", "Backlog", 0),
            ("col-discovery", "Discovery", 1),
            ("col-progress", "In Progress", 2),
            ("col-review", "Review", 3),
            ("col-done", "Done", 4),
        ]
        for col_id, title, pos in default_columns:
            cursor.execute(
                "INSERT INTO columns (id, board_id, title, position) VALUES (?, ?, ?, ?)",
                (col_id, board_id, title, pos)
            )

        # Default cards
        default_cards = [
            ("card-1", "col-backlog", "Align roadmap themes", "Draft quarterly themes with impact statements and metrics.", 0),
            ("card-2", "col-backlog", "Gather customer signals", "Review support tags, sales notes, and churn feedback.", 1),
            ("card-3", "col-discovery", "Prototype analytics view", "Sketch initial dashboard layout and key drill-downs.", 0),
            ("card-4", "col-progress", "Refine status language", "Standardize column labels and tone across the board.", 0),
            ("card-5", "col-progress", "Design card layout", "Add hierarchy and spacing for scanning dense lists.", 1),
            ("card-6", "col-review", "QA micro-interactions", "Verify hover, focus, and loading states.", 0),
            ("card-7", "col-done", "Ship marketing page", "Final copy approved and asset pack delivered.", 0),
            ("card-8", "col-done", "Close onboarding sprint", "Document release notes and share internally.", 1),
        ]
        for card_id, col_id, title, details, pos in default_cards:
            cursor.execute(
                "INSERT INTO cards (id, column_id, title, details, position) VALUES (?, ?, ?, ?, ?)",
                (card_id, col_id, title, details, pos)
            )

    conn.commit()
    conn.close()

def get_board_json(username: str = "user", db_path: str = DB_PATH) -> Dict[str, Any]:
    conn = get_db_connection(db_path)
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM users WHERE username = ?", (username,))
    user_row = cursor.fetchone()
    if not user_row:
        conn.close()
        return {}

    user_id = user_row["id"]
    cursor.execute("SELECT id, title FROM boards WHERE user_id = ?", (user_id,))
    board_row = cursor.fetchone()
    if not board_row:
        conn.close()
        return {}

    board_id = board_row["id"]
    board_title = board_row["title"]

    cursor.execute("SELECT id, title, position FROM columns WHERE board_id = ? ORDER BY position", (board_id,))
    column_rows = cursor.fetchall()

    columns: List[Dict[str, Any]] = []
    cards_map: Dict[str, Any] = {}

    for col in column_rows:
        col_id = col["id"]
        cursor.execute("SELECT id, title, details, position FROM cards WHERE column_id = ? ORDER BY position", (col_id,))
        card_rows = cursor.fetchall()

        card_ids = []
        for card in card_rows:
            c_id = card["id"]
            card_ids.append(c_id)
            cards_map[c_id] = {
                "id": c_id,
                "title": card["title"],
                "details": card["details"]
            }

        columns.append({
            "id": col_id,
            "title": col["title"],
            "cardIds": card_ids
        })

    conn.close()
    return {
        "user_id": username,
        "board_id": board_id,
        "title": board_title,
        "columns": columns,
        "cards": cards_map
    }

def save_board_json(username: str, board_data: Dict[str, Any], db_path: str = DB_PATH):
    conn = get_db_connection(db_path)
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM users WHERE username = ?", (username,))
    user_row = cursor.fetchone()
    if not user_row:
        conn.close()
        return

    user_id = user_row["id"]
    cursor.execute("SELECT id FROM boards WHERE user_id = ?", (user_id,))
    board_row = cursor.fetchone()
    if not board_row:
        conn.close()
        return

    board_id = board_row["id"]
    columns = board_data.get("columns", [])
    cards_dict = board_data.get("cards", {})

    # Delete existing columns & cards for clean update
    cursor.execute("SELECT id FROM columns WHERE board_id = ?", (board_id,))
    existing_cols = cursor.fetchall()
    for col in existing_cols:
        cursor.execute("DELETE FROM cards WHERE column_id = ?", (col["id"],))
    cursor.execute("DELETE FROM columns WHERE board_id = ?", (board_id,))

    for col_idx, col in enumerate(columns):
        col_id = col.get("id", f"col-{col_idx}")
        col_title = col.get("title", f"Column {col_idx + 1}")
        cursor.execute(
            "INSERT INTO columns (id, board_id, title, position) VALUES (?, ?, ?, ?)",
            (col_id, board_id, col_title, col_idx)
        )

        card_ids = col.get("cardIds", [])
        for card_idx, c_id in enumerate(card_ids):
            c_data = cards_dict.get(c_id, {"id": c_id, "title": "Untitled", "details": ""})
            c_title = c_data.get("title", "Untitled")
            c_details = c_data.get("details", "")
            cursor.execute(
                "INSERT INTO cards (id, column_id, title, details, position) VALUES (?, ?, ?, ?, ?)",
                (c_id, col_id, c_title, c_details, card_idx)
            )

    conn.commit()
    conn.close()

def create_card_db(column_id: str, title: str, details: str = "", db_path: str = DB_PATH) -> str:
    conn = get_db_connection(db_path)
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) as count FROM cards WHERE column_id = ?", (column_id,))
    count = cursor.fetchone()["count"]

    card_id = f"card-{uuid.uuid4().hex[:6]}"
    cursor.execute(
        "INSERT INTO cards (id, column_id, title, details, position) VALUES (?, ?, ?, ?, ?)",
        (card_id, column_id, title, details, count)
    )
    conn.commit()
    conn.close()
    return card_id

def update_card_db(card_id: str, title: str = None, details: str = None, column_id: str = None, db_path: str = DB_PATH):
    conn = get_db_connection(db_path)
    cursor = conn.cursor()

    cursor.execute("SELECT column_id, title, details FROM cards WHERE id = ?", (card_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return

    new_column_id = column_id if column_id is not None else row["column_id"]
    new_title = title if title is not None else row["title"]
    new_details = details if details is not None else row["details"]

    cursor.execute(
        "UPDATE cards SET column_id = ?, title = ?, details = ? WHERE id = ?",
        (new_column_id, new_title, new_details, card_id)
    )
    conn.commit()
    conn.close()

def delete_card_db(card_id: str, db_path: str = DB_PATH):
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM cards WHERE id = ?", (card_id,))
    conn.commit()
    conn.close()

def rename_column_db(column_id: str, title: str, db_path: str = DB_PATH):
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    cursor.execute("UPDATE columns SET title = ? WHERE id = ?", (title, column_id))
    conn.commit()
    conn.close()
