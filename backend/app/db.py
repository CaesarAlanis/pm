from __future__ import annotations

import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path

DEFAULT_DB_PATH = "data/kanban.db"


def get_db_path() -> Path:
    return Path(os.environ.get("DB_PATH", DEFAULT_DB_PATH))


def init_db() -> None:
    path = get_db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(path) as conn:
        conn.execute("PRAGMA foreign_keys = ON")
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
              id TEXT PRIMARY KEY,
              username TEXT UNIQUE NOT NULL,
              created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS boards (
              id TEXT PRIMARY KEY,
              user_id TEXT UNIQUE NOT NULL,
              name TEXT NOT NULL,
              created_at TEXT NOT NULL,
              FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS columns (
              id TEXT PRIMARY KEY,
              board_id TEXT NOT NULL,
              title TEXT NOT NULL,
              position INTEGER NOT NULL,
              created_at TEXT NOT NULL,
              FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS cards (
              id TEXT PRIMARY KEY,
              column_id TEXT NOT NULL,
              title TEXT NOT NULL,
              details TEXT NOT NULL,
              position INTEGER NOT NULL,
              created_at TEXT NOT NULL,
              FOREIGN KEY (column_id) REFERENCES columns(id) ON DELETE CASCADE
            );
            """
        )


@contextmanager
def get_connection():
    path = get_db_path()
    conn = sqlite3.connect(path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
    finally:
        conn.close()
