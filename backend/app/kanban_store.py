import json
import sqlite3
from pathlib import Path


def _now_sql() -> str:
    return "strftime('%Y-%m-%dT%H:%M:%fZ', 'now')"


class KanbanStore:
    def __init__(self, db_path: str) -> None:
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.conn = sqlite3.connect(self.db_path, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self.conn.execute("PRAGMA foreign_keys = ON")

    def bootstrap(self) -> None:
        self._create_schema()
        with self.conn:
            self.conn.execute(
                f"""
                INSERT INTO users (username, created_at, updated_at)
                VALUES (?, {_now_sql()}, {_now_sql()})
                ON CONFLICT(username) DO UPDATE SET updated_at = {_now_sql()}
                """,
                ("user",),
            )
            user_id = self._get_user_id("user")
            board_id = self._ensure_board(user_id)
            self._ensure_default_columns(board_id)
            self._ensure_default_cards(board_id)
            self._ensure_initial_snapshot(board_id)

    def get_board(self, username: str) -> dict:
        board_id = self._get_board_id_for_user(username)
        return self._build_board_state(board_id)

    def rename_column(self, username: str, column_ref: str, title: str) -> dict:
        board_id = self._get_board_id_for_user(username)
        column_id = self._parse_ref(column_ref, "col")

        with self.conn:
            result = self.conn.execute(
                f"""
                UPDATE columns
                SET title = ?, updated_at = {_now_sql()}
                WHERE id = ? AND board_id = ?
                """,
                (title, column_id, board_id),
            )
            if result.rowcount == 0:
                raise ValueError("Column not found")
            self._save_snapshot(board_id, "rename_column")

        return self._build_board_state(board_id)

    def create_card(
        self, username: str, column_ref: str, title: str, details: str
    ) -> dict:
        board_id = self._get_board_id_for_user(username)
        column_id = self._parse_ref(column_ref, "col")

        with self.conn:
            row = self.conn.execute(
                """
                SELECT COALESCE(MAX(position), -1) + 1 AS next_pos
                FROM cards
                WHERE column_id = ?
                """,
                (column_id,),
            ).fetchone()
            next_pos = int(row["next_pos"])

            self.conn.execute(
                f"""
                INSERT INTO cards (board_id, column_id, title, details, position, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, {_now_sql()}, {_now_sql()})
                """,
                (board_id, column_id, title, details or "No details yet.", next_pos),
            )
            self._save_snapshot(board_id, "create_card")

        return self._build_board_state(board_id)

    def update_card(
        self, username: str, card_ref: str, title: str | None, details: str | None
    ) -> dict:
        board_id = self._get_board_id_for_user(username)
        card_id = self._parse_ref(card_ref, "card")

        row = self.conn.execute(
            "SELECT id, title, details FROM cards WHERE id = ? AND board_id = ?",
            (card_id, board_id),
        ).fetchone()
        if row is None:
            raise ValueError("Card not found")

        next_title = title if title is not None else row["title"]
        next_details = details if details is not None else row["details"]

        with self.conn:
            self.conn.execute(
                f"""
                UPDATE cards
                SET title = ?, details = ?, updated_at = {_now_sql()}
                WHERE id = ? AND board_id = ?
                """,
                (next_title, next_details, card_id, board_id),
            )
            self._save_snapshot(board_id, "update_card")

        return self._build_board_state(board_id)

    def delete_card(self, username: str, card_ref: str) -> dict:
        board_id = self._get_board_id_for_user(username)
        card_id = self._parse_ref(card_ref, "card")

        row = self.conn.execute(
            "SELECT column_id, position FROM cards WHERE id = ? AND board_id = ?",
            (card_id, board_id),
        ).fetchone()
        if row is None:
            raise ValueError("Card not found")

        column_id = int(row["column_id"])
        position = int(row["position"])

        with self.conn:
            self.conn.execute(
                "DELETE FROM cards WHERE id = ? AND board_id = ?",
                (card_id, board_id),
            )
            self.conn.execute(
                """
                UPDATE cards
                SET position = position - 1
                WHERE column_id = ? AND position > ?
                """,
                (column_id, position),
            )
            self._save_snapshot(board_id, "delete_card")

        return self._build_board_state(board_id)

    def move_card(
        self,
        username: str,
        card_ref: str,
        target_column_ref: str,
        target_index: int | None,
    ) -> dict:
        board_id = self._get_board_id_for_user(username)
        card_id = self._parse_ref(card_ref, "card")
        target_column_id = self._parse_ref(target_column_ref, "col")

        row = self.conn.execute(
            """
            SELECT id, column_id, position
            FROM cards
            WHERE id = ? AND board_id = ?
            """,
            (card_id, board_id),
        ).fetchone()
        if row is None:
            raise ValueError("Card not found")

        source_column_id = int(row["column_id"])
        source_position = int(row["position"])

        count_row = self.conn.execute(
            "SELECT COUNT(1) AS card_count FROM cards WHERE column_id = ?",
            (target_column_id,),
        ).fetchone()
        card_count = int(count_row["card_count"])
        if source_column_id == target_column_id:
            max_index = max(0, card_count - 1)
            insert_index = (
                max_index if target_index is None else max(0, min(target_index, max_index))
            )
        else:
            max_index = card_count
            insert_index = (
                max_index if target_index is None else max(0, min(target_index, max_index))
            )

        with self.conn:
            # Move the card out of normal position space first to avoid UNIQUE conflicts.
            self.conn.execute(
                """
                UPDATE cards
                SET position = -1
                WHERE id = ? AND board_id = ?
                """,
                (card_id, board_id),
            )

            self.conn.execute(
                """
                UPDATE cards
                SET position = position - 1
                WHERE column_id = ? AND position > ?
                """,
                (source_column_id, source_position),
            )

            self.conn.execute(
                """
                UPDATE cards
                SET position = position + 1
                WHERE column_id = ? AND position >= ?
                """,
                (target_column_id, insert_index),
            )

            self.conn.execute(
                """
                UPDATE cards
                SET column_id = ?, position = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
                WHERE id = ? AND board_id = ?
                """,
                (target_column_id, insert_index, card_id, board_id),
            )

            self._save_snapshot(board_id, "move_card")

        return self._build_board_state(board_id)

    def _create_schema(self) -> None:
        with self.conn:
            self.conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS schema_version (
                  version INTEGER NOT NULL PRIMARY KEY,
                  applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
                );

                CREATE TABLE IF NOT EXISTS users (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  username TEXT NOT NULL UNIQUE,
                  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
                  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
                );

                CREATE TABLE IF NOT EXISTS boards (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  user_id INTEGER NOT NULL,
                  groupname TEXT NOT NULL,
                  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
                  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
                  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                );

                CREATE UNIQUE INDEX IF NOT EXISTS ux_boards_user_id_groupname
                  ON boards(user_id, groupname);

                CREATE TABLE IF NOT EXISTS columns (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  board_id INTEGER NOT NULL,
                  stable_key TEXT NOT NULL,
                  title TEXT NOT NULL,
                  position INTEGER NOT NULL,
                  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
                  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
                  FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
                  UNIQUE (board_id, stable_key),
                  UNIQUE (board_id, position)
                );

                CREATE INDEX IF NOT EXISTS ix_columns_board_id
                  ON columns(board_id);

                CREATE TABLE IF NOT EXISTS cards (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  board_id INTEGER NOT NULL,
                  column_id INTEGER NOT NULL,
                  title TEXT NOT NULL,
                  details TEXT NOT NULL,
                  position INTEGER NOT NULL,
                  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
                  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
                  FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
                  FOREIGN KEY (column_id) REFERENCES columns(id) ON DELETE CASCADE,
                  UNIQUE (column_id, position)
                );

                CREATE INDEX IF NOT EXISTS ix_cards_board_id
                  ON cards(board_id);

                CREATE INDEX IF NOT EXISTS ix_cards_column_id
                  ON cards(column_id);

                CREATE TABLE IF NOT EXISTS board_snapshots (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  board_id INTEGER NOT NULL,
                  snapshot_json TEXT NOT NULL,
                  reason TEXT NOT NULL,
                  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
                  FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
                );

                CREATE INDEX IF NOT EXISTS ix_snapshots_board_created
                  ON board_snapshots(board_id, created_at DESC);
                """
            )

    def _get_user_id(self, username: str) -> int:
        row = self.conn.execute(
            "SELECT id FROM users WHERE username = ?", (username,)
        ).fetchone()
        if row is None:
            raise ValueError("User not found")
        return int(row["id"])

    def _ensure_board(self, user_id: int) -> int:
        row = self.conn.execute(
            "SELECT id FROM boards WHERE user_id = ? ORDER BY id LIMIT 1", (user_id,)
        ).fetchone()
        if row is not None:
            return int(row["id"])

        cursor = self.conn.execute(
            f"""
            INSERT INTO boards (user_id, groupname, created_at, updated_at)
            VALUES (?, ?, {_now_sql()}, {_now_sql()})
            """,
            (user_id, "Primary Board"),
        )
        return int(cursor.lastrowid)

    def _ensure_default_columns(self, board_id: int) -> None:
        row = self.conn.execute(
            "SELECT COUNT(1) AS c FROM columns WHERE board_id = ?", (board_id,)
        ).fetchone()
        if int(row["c"]) > 0:
            return

        defaults = [
            ("backlog", "Backlog", 0),
            ("discovery", "Discovery", 1),
            ("in_progress", "In Progress", 2),
            ("review", "Review", 3),
            ("done", "Done", 4),
        ]

        for stable_key, title, position in defaults:
            self.conn.execute(
                f"""
                INSERT INTO columns (board_id, stable_key, title, position, created_at, updated_at)
                VALUES (?, ?, ?, ?, {_now_sql()}, {_now_sql()})
                """,
                (board_id, stable_key, title, position),
            )

    def _ensure_default_cards(self, board_id: int) -> None:
        row = self.conn.execute(
            "SELECT COUNT(1) AS c FROM cards WHERE board_id = ?", (board_id,)
        ).fetchone()
        if int(row["c"]) > 0:
            return

        columns = self.conn.execute(
            "SELECT id, stable_key FROM columns WHERE board_id = ?", (board_id,)
        ).fetchall()
        key_to_column_id = {row["stable_key"]: int(row["id"]) for row in columns}

        defaults = [
            (
                "backlog",
                0,
                "Align roadmap themes",
                "Draft quarterly themes with impact statements and metrics.",
            ),
            (
                "backlog",
                1,
                "Gather customer signals",
                "Review support tags, sales notes, and churn feedback.",
            ),
            (
                "discovery",
                0,
                "Prototype analytics view",
                "Sketch initial dashboard layout and key drill-downs.",
            ),
            (
                "in_progress",
                0,
                "Refine status language",
                "Standardize column labels and tone across the board.",
            ),
            (
                "in_progress",
                1,
                "Design card layout",
                "Add hierarchy and spacing for scanning dense lists.",
            ),
            (
                "review",
                0,
                "QA micro-interactions",
                "Verify hover, focus, and loading states.",
            ),
            (
                "done",
                0,
                "Ship marketing page",
                "Final copy approved and asset pack delivered.",
            ),
            (
                "done",
                1,
                "Close onboarding sprint",
                "Document release notes and share internally.",
            ),
        ]

        for key, position, title, details in defaults:
            self.conn.execute(
                f"""
                INSERT INTO cards (board_id, column_id, title, details, position, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, {_now_sql()}, {_now_sql()})
                """,
                (board_id, key_to_column_id[key], title, details, position),
            )

    def _ensure_initial_snapshot(self, board_id: int) -> None:
        row = self.conn.execute(
            "SELECT COUNT(1) AS c FROM board_snapshots WHERE board_id = ?", (board_id,)
        ).fetchone()
        if int(row["c"]) == 0:
            self._save_snapshot(board_id, "bootstrap")

    def _save_snapshot(self, board_id: int, reason: str) -> None:
        snapshot = self._build_board_state(board_id)
        self.conn.execute(
            """
            INSERT INTO board_snapshots (board_id, snapshot_json, reason)
            VALUES (?, ?, ?)
            """,
            (board_id, json.dumps(snapshot), reason),
        )

    def _build_board_state(self, board_id: int) -> dict:
        columns_rows = self.conn.execute(
            """
            SELECT id, title
            FROM columns
            WHERE board_id = ?
            ORDER BY position
            """,
            (board_id,),
        ).fetchall()

        cards_rows = self.conn.execute(
            """
            SELECT id, column_id, title, details
            FROM cards
            WHERE board_id = ?
            ORDER BY column_id, position
            """,
            (board_id,),
        ).fetchall()

        cards: dict[str, dict] = {}
        card_ids_by_column: dict[int, list[str]] = {
            int(row["id"]): [] for row in columns_rows
        }

        for row in cards_rows:
            card_ref = f"card-{int(row['id'])}"
            cards[card_ref] = {
                "id": card_ref,
                "title": row["title"],
                "details": row["details"],
            }
            card_ids_by_column[int(row["column_id"])].append(card_ref)

        columns: list[dict] = []
        for row in columns_rows:
            column_id = int(row["id"])
            columns.append(
                {
                    "id": f"col-{column_id}",
                    "title": row["title"],
                    "cardIds": card_ids_by_column[column_id],
                }
            )

        return {"columns": columns, "cards": cards}

    def _get_board_id_for_user(self, username: str) -> int:
        row = self.conn.execute(
            """
            SELECT b.id
            FROM boards b
            JOIN users u ON u.id = b.user_id
            WHERE u.username = ?
            ORDER BY b.id
            LIMIT 1
            """,
            (username,),
        ).fetchone()
        if row is None:
            raise ValueError("Board not found")
        return int(row["id"])

    def _parse_ref(self, value: str, prefix: str) -> int:
        token = f"{prefix}-"
        if not value.startswith(token):
            raise ValueError(f"Invalid {prefix} id")
        raw = value.removeprefix(token)
        if not raw.isdigit():
            raise ValueError(f"Invalid {prefix} id")
        return int(raw)