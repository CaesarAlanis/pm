from __future__ import annotations

from datetime import datetime
from uuid import uuid4

from app.db import get_connection
from app.schemas import Board

DEFAULT_COLUMNS = [
    {"id": "col-backlog", "title": "Backlog", "card_ids": ["card-1", "card-2"]},
    {"id": "col-discovery", "title": "Discovery", "card_ids": ["card-3"]},
    {
        "id": "col-progress",
        "title": "In Progress",
        "card_ids": ["card-4", "card-5"],
    },
    {"id": "col-review", "title": "Review", "card_ids": ["card-6"]},
    {"id": "col-done", "title": "Done", "card_ids": ["card-7", "card-8"]},
]

DEFAULT_CARDS = {
    "card-1": {
        "id": "card-1",
        "title": "Align roadmap themes",
        "details": "Draft quarterly themes with impact statements and metrics.",
    },
    "card-2": {
        "id": "card-2",
        "title": "Gather customer signals",
        "details": "Review support tags, sales notes, and churn feedback.",
    },
    "card-3": {
        "id": "card-3",
        "title": "Prototype analytics view",
        "details": "Sketch initial dashboard layout and key drill-downs.",
    },
    "card-4": {
        "id": "card-4",
        "title": "Refine status language",
        "details": "Standardize column labels and tone across the board.",
    },
    "card-5": {
        "id": "card-5",
        "title": "Design card layout",
        "details": "Add hierarchy and spacing for scanning dense lists.",
    },
    "card-6": {
        "id": "card-6",
        "title": "QA micro-interactions",
        "details": "Verify hover, focus, and loading states.",
    },
    "card-7": {
        "id": "card-7",
        "title": "Ship marketing page",
        "details": "Final copy approved and asset pack delivered.",
    },
    "card-8": {
        "id": "card-8",
        "title": "Close onboarding sprint",
        "details": "Document release notes and share internally.",
    },
}


def get_board_for_user(username: str) -> Board:
    with get_connection() as conn:
        board_id = _ensure_user_and_board(conn, username)
        return _fetch_board(conn, board_id)


def upsert_board_for_user(username: str, board: Board) -> Board:
    with get_connection() as conn:
        board_id = _ensure_user_and_board(conn, username)
        _replace_board(conn, board_id, board)
        return _fetch_board(conn, board_id)


def _ensure_user_and_board(conn, username: str) -> str:
    now = datetime.utcnow().isoformat()
    row = conn.execute(
        "SELECT boards.id FROM boards JOIN users ON boards.user_id = users.id WHERE users.username = ?",
        (username,),
    ).fetchone()
    if row:
        return row["id"]

    user_id = str(uuid4())
    board_id = str(uuid4())
    conn.execute(
        "INSERT INTO users (id, username, created_at) VALUES (?, ?, ?)",
        (user_id, username, now),
    )
    conn.execute(
        "INSERT INTO boards (id, user_id, name, created_at) VALUES (?, ?, ?, ?)",
        (board_id, user_id, "Default board", now),
    )
    _replace_board(conn, board_id, Board(columns=DEFAULT_COLUMNS, cards=DEFAULT_CARDS))
    conn.commit()
    return board_id


def _replace_board(conn, board_id: str, board: Board) -> None:
    now = datetime.utcnow().isoformat()
    conn.execute(
        "DELETE FROM cards WHERE column_id IN (SELECT id FROM columns WHERE board_id = ?)",
        (board_id,),
    )
    conn.execute("DELETE FROM columns WHERE board_id = ?", (board_id,))

    for column_index, column in enumerate(board.columns):
        conn.execute(
            "INSERT INTO columns (id, board_id, title, position, created_at) VALUES (?, ?, ?, ?, ?)",
            (column.id, board_id, column.title, column_index, now),
        )
        for card_index, card_id in enumerate(column.card_ids):
            card = board.cards.get(card_id)
            if not card:
                continue
            conn.execute(
                """
                INSERT INTO cards (id, column_id, title, details, position, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (card.id, column.id, card.title, card.details, card_index, now),
            )
    conn.commit()


def _fetch_board(conn, board_id: str) -> Board:
    columns = conn.execute(
        "SELECT id, title FROM columns WHERE board_id = ? ORDER BY position",
        (board_id,),
    ).fetchall()
    cards = {}
    column_payload = []
    for column in columns:
        card_rows = conn.execute(
            "SELECT id, title, details FROM cards WHERE column_id = ? ORDER BY position",
            (column["id"],),
        ).fetchall()
        card_ids = []
        for row in card_rows:
            cards[row["id"]] = {
                "id": row["id"],
                "title": row["title"],
                "details": row["details"],
            }
            card_ids.append(row["id"])
        column_payload.append(
            {"id": column["id"], "title": column["title"], "card_ids": card_ids}
        )
    return Board(columns=column_payload, cards=cards)
