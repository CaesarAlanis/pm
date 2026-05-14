import sqlite3
import os
from pathlib import Path

import bcrypt

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
            default_pass = os.environ.get("AUTH_PASSWORD", "password")
            password_hash = bcrypt.hashpw(default_pass.encode(), bcrypt.gensalt()).decode()
            seed = (Path(__file__).parent / "seed.sql").read_text()
            seed = seed.replace("$2b$12$placeholder_hash_replaced_at_runtime", password_hash)
            conn.executescript(seed)
            conn.commit()
    finally:
        conn.close()


def _run_migrations() -> None:
    """Apply schema migrations for existing databases."""
    conn = get_connection()
    try:
        # Migration: add priority, due_date, labels to cards
        card_cols = [r["name"] for r in conn.execute("PRAGMA table_info(cards)").fetchall()]
        if "priority" not in card_cols:
            conn.execute('ALTER TABLE cards ADD COLUMN priority TEXT NOT NULL DEFAULT "none"')
        if "due_date" not in card_cols:
            conn.execute("ALTER TABLE cards ADD COLUMN due_date TEXT")
        if "labels" not in card_cols:
            conn.execute('ALTER TABLE cards ADD COLUMN labels TEXT NOT NULL DEFAULT ""')
        if "story_points" not in card_cols:
            conn.execute("ALTER TABLE cards ADD COLUMN story_points INTEGER")
        if "estimated_hours" not in card_cols:
            conn.execute("ALTER TABLE cards ADD COLUMN estimated_hours REAL")
        if "actual_hours" not in card_cols:
            conn.execute("ALTER TABLE cards ADD COLUMN actual_hours REAL NOT NULL DEFAULT 0")
        # Migration: add description to boards
        board_cols = [r["name"] for r in conn.execute("PRAGMA table_info(boards)").fetchall()]
        if "description" not in board_cols:
            conn.execute('ALTER TABLE boards ADD COLUMN description TEXT NOT NULL DEFAULT ""')
        if "archived" not in board_cols:
            conn.execute("ALTER TABLE boards ADD COLUMN archived INTEGER NOT NULL DEFAULT 0")
        if "favorite" not in board_cols:
            conn.execute("ALTER TABLE boards ADD COLUMN favorite INTEGER NOT NULL DEFAULT 0")
        if "updated_at" not in board_cols:
            conn.execute("ALTER TABLE boards ADD COLUMN updated_at TEXT")
        # Ensure newer tables exist
        _ensure_table(conn, "board_members", """CREATE TABLE IF NOT EXISTS board_members (
            board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('owner', 'editor', 'viewer')),
            joined_at TEXT NOT NULL DEFAULT (datetime('now')),
            PRIMARY KEY (board_id, user_id)
        )""")
        _ensure_table(conn, "activity_log", """CREATE TABLE IF NOT EXISTS activity_log (
            id TEXT PRIMARY KEY,
            board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
            user_id TEXT NOT NULL REFERENCES users(id),
            action TEXT NOT NULL,
            details TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )""")
        _ensure_table(conn, "comments", """CREATE TABLE IF NOT EXISTS comments (
            id TEXT PRIMARY KEY,
            card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
            user_id TEXT NOT NULL REFERENCES users(id),
            content TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT
        )""")
        _ensure_table(conn, "card_assignees", """CREATE TABLE IF NOT EXISTS card_assignees (
            card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            assigned_at TEXT NOT NULL DEFAULT (datetime('now')),
            PRIMARY KEY (card_id, user_id)
        )""")
        _ensure_table(conn, "checklists", """CREATE TABLE IF NOT EXISTS checklists (
            id TEXT PRIMARY KEY,
            card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            position INTEGER NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )""")
        _ensure_table(conn, "checklist_items", """CREATE TABLE IF NOT EXISTS checklist_items (
            id TEXT PRIMARY KEY,
            checklist_id TEXT NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
            content TEXT NOT NULL,
            checked INTEGER NOT NULL DEFAULT 0,
            position INTEGER NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )""")
        _ensure_table(conn, "notifications", """CREATE TABLE IF NOT EXISTS notifications (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
            action TEXT NOT NULL,
            details TEXT NOT NULL DEFAULT '',
            read INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )""")
        _ensure_table(conn, "board_templates", """CREATE TABLE IF NOT EXISTS board_templates (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT NOT NULL DEFAULT '',
            columns TEXT NOT NULL DEFAULT '[]',
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )""")
        _ensure_table(conn, "revoked_tokens", """CREATE TABLE IF NOT EXISTS revoked_tokens (
            token TEXT PRIMARY KEY,
            revoked_at TEXT NOT NULL DEFAULT (datetime('now'))
        )""")
        _ensure_table(conn, "user_session_versions", """CREATE TABLE IF NOT EXISTS user_session_versions (
            user_id TEXT PRIMARY KEY REFERENCES users(id),
            version INTEGER NOT NULL DEFAULT 1
        )""")
        _ensure_table(conn, "card_attachments", """CREATE TABLE IF NOT EXISTS card_attachments (
            id TEXT PRIMARY KEY,
            card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
            filename TEXT NOT NULL,
            file_path TEXT NOT NULL,
            file_size INTEGER NOT NULL DEFAULT 0,
            content_type TEXT NOT NULL DEFAULT '',
            uploaded_by TEXT NOT NULL REFERENCES users(id),
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )""")
        _ensure_table(conn, "card_links", """CREATE TABLE IF NOT EXISTS card_links (
            id TEXT PRIMARY KEY,
            source_card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
            target_card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
            link_type TEXT NOT NULL CHECK (link_type IN ('blocked_by', 'relates_to')),
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            UNIQUE(source_card_id, target_card_id, link_type)
        )""")
        _ensure_table(conn, "time_logs", """CREATE TABLE IF NOT EXISTS time_logs (
            id TEXT PRIMARY KEY,
            card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
            user_id TEXT NOT NULL REFERENCES users(id),
            hours REAL NOT NULL CHECK (hours > 0),
            logged_at TEXT NOT NULL DEFAULT (datetime('now')),
            note TEXT NOT NULL DEFAULT ''
        )""")
        # Ensure indexes exist
        for idx_sql in [
            "CREATE INDEX IF NOT EXISTS idx_boards_user_id ON boards(user_id)",
            "CREATE INDEX IF NOT EXISTS idx_boards_archived ON boards(archived)",
            "CREATE INDEX IF NOT EXISTS idx_boards_favorite ON boards(favorite)",
            "CREATE INDEX IF NOT EXISTS idx_columns_board_id ON columns(board_id)",
            "CREATE INDEX IF NOT EXISTS idx_cards_column_id ON cards(column_id)",
            "CREATE INDEX IF NOT EXISTS idx_board_members_user_id ON board_members(user_id)",
            "CREATE INDEX IF NOT EXISTS idx_activity_log_board_id ON activity_log(board_id)",
            "CREATE INDEX IF NOT EXISTS idx_comments_card_id ON comments(card_id)",
            "CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id)",
            "CREATE INDEX IF NOT EXISTS idx_card_assignees_user_id ON card_assignees(user_id)",
            "CREATE INDEX IF NOT EXISTS idx_checklists_card_id ON checklists(card_id)",
            "CREATE INDEX IF NOT EXISTS idx_checklist_items_checklist_id ON checklist_items(checklist_id)",
            "CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)",
            "CREATE INDEX IF NOT EXISTS idx_notifications_board_id ON notifications(board_id)",
            "CREATE INDEX IF NOT EXISTS idx_card_attachments_card_id ON card_attachments(card_id)",
            "CREATE INDEX IF NOT EXISTS idx_card_links_source ON card_links(source_card_id)",
            "CREATE INDEX IF NOT EXISTS idx_card_links_target ON card_links(target_card_id)",
            "CREATE INDEX IF NOT EXISTS idx_time_logs_card_id ON time_logs(card_id)",
        ]:
            conn.execute(idx_sql)
        conn.commit()
    finally:
        conn.close()


def _ensure_table(conn: sqlite3.Connection, table_name: str, create_sql: str) -> None:
    exists = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table_name,)
    ).fetchone()
    if not exists:
        conn.execute(create_sql)


def ensure_db() -> None:
    init_db()
    _run_migrations()
    seed_db_if_empty()
    from app.db.template import seed_templates
    seed_templates()


def board_id_for_user(conn: sqlite3.Connection, username: str) -> str | None:
    row = conn.execute(
        """SELECT b.id FROM boards b
           JOIN users u ON b.user_id = u.id
           WHERE u.username = ?""",
        (username,),
    ).fetchone()
    return row["id"] if row else None


def user_owns_board(conn: sqlite3.Connection, board_id: str, username: str) -> bool:
    row = conn.execute(
        """SELECT 1 FROM boards b
           JOIN users u ON b.user_id = u.id
           WHERE b.id = ? AND u.username = ?""",
        (board_id, username),
    ).fetchone()
    return row is not None


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


def user_can_access_card(conn: sqlite3.Connection, card_id: str, username: str, min_role: str = "viewer") -> bool:
    if user_owns_card(conn, card_id, username):
        return True
    role_order = {"viewer": 0, "editor": 1, "owner": 2}
    row = conn.execute(
        """SELECT bm.role FROM cards ca
           JOIN columns c ON ca.column_id = c.id
           JOIN board_members bm ON c.board_id = bm.board_id
           JOIN users u ON bm.user_id = u.id
           WHERE ca.id = ? AND u.username = ?""",
        (card_id, username),
    ).fetchone()
    if not row:
        return False
    return role_order.get(row["role"], 0) >= role_order.get(min_role, 0)


def user_can_access_board(conn: sqlite3.Connection, board_id: str, username: str, min_role: str = "viewer") -> bool:
    if user_owns_board(conn, board_id, username):
        return True
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


def get_board_id_for_card(conn: sqlite3.Connection, card_id: str) -> str | None:
    row = conn.execute(
        """SELECT c.board_id FROM cards ca
           JOIN columns c ON ca.column_id = c.id
           WHERE ca.id = ?""",
        (card_id,),
    ).fetchone()
    return row["board_id"] if row else None


def get_board_id_for_column(conn: sqlite3.Connection, column_id: str) -> str | None:
    row = conn.execute(
        "SELECT board_id FROM columns WHERE id = ?",
        (column_id,),
    ).fetchone()
    return row["board_id"] if row else None
