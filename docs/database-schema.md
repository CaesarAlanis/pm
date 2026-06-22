# Database Schema Proposal (Part 5)

## Goals

- Persist Kanban board state in normalized SQLite tables.
- Support one board per user in MVP while allowing multiple boards later.
- Keep a JSON snapshot history for reconstruction/debugging.

## Entity Model

- `users` owns boards.
- `boards` owns columns and cards.
- `columns` defines ordered workflow lanes.
- `cards` defines ordered items within columns.
- `board_snapshots` stores point-in-time serialized board JSON.

## SQL DDL

```sql
PRAGMA foreign_keys = ON;

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
```

## MVP Mapping

- MVP user uses `username='user'`.
- MVP still supports future users because `users` is not hardcoded to one row.
- MVP one-board constraint is enforced by app logic (create one board at bootstrap).
- Schema allows future multi-board support without migration redesign.

## Column Strategy

- `stable_key` stores canonical identity (`backlog`, `discovery`, `in_progress`, `review`, `done`).
- `title` is user-editable display text.
- This keeps renaming independent from identity.

## Ordering Strategy

- Columns sorted by `columns.position`.
- Cards sorted by `(cards.column_id, cards.position)`.
- Move operations rewrite only impacted positions in source/target columns.

## Snapshot Strategy

- Snapshot is stored after each board mutation in `board_snapshots`.
- Snapshot JSON shape aligns with frontend board shape:
  - `columns[]`: id, key, title, position
  - `cards[]`: id, column_id, title, details, position
- `reason` records mutation source (for example: `rename_column`, `move_card`, `ai_operation`).

## Bootstrap and Migration Approach

1. On app startup, open SQLite database file (create if missing).
2. Execute DDL with `CREATE TABLE IF NOT EXISTS` and indexes.
3. Upsert MVP user (`user`).
4. If user has no board, create one default board plus 5 default columns.
5. Insert initial cards and store initial snapshot.

Migration policy for MVP:

- Keep a minimal `schema_version` table:

```sql
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER NOT NULL PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
```

- Start at version `1`.
- Future schema changes append explicit SQL migrations in order.

## Why This Meets Part 5

- Normalized model: `users`, `boards`, `columns`, `cards`.
- Snapshot support: `board_snapshots` with JSON payload.
- One-user/one-board MVP behavior while preserving future extensibility.
- Simple bootstrap path for first-run local SQLite creation.