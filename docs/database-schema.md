# Database schema for the PM MVP

This document describes the SQLite schema for the MVP backend. The design keeps the board state simple: one JSON blob per user board.

## Goals

- Store user identity and board state in SQLite.
- Keep the Kanban board structure as a single JSON blob.
- Allow future extension for conversation history or AI chat.

## Entities

### users
Stores authenticated users and minimal identity data.

- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `username` TEXT NOT NULL UNIQUE
- `display_name` TEXT
- `created_at` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP

### boards
Stores one board per user as a single JSON payload.

- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `user_id` INTEGER NOT NULL REFERENCES users(id)
- `board_json` TEXT NOT NULL
- `updated_at` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP

Notes
- `board_json` contains the complete Kanban board state.
- The board state is stored as one JSON blob, not as normalized row data.
- This schema supports one board per user.

### conversations (optional)
Stores AI chat history if the app later adds AI conversation persistence.

- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `user_id` INTEGER NOT NULL REFERENCES users(id)
- `role` TEXT NOT NULL
- `message` TEXT NOT NULL
- `created_at` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP

## Board JSON shape

The Kanban board JSON blob should capture the full board state. Example structure:

```json
{
  "cards": {
    "card-1": { "id": "card-1", "title": "Start project", "details": "Create board and add tasks." },
    "card-2": { "id": "card-2", "title": "Design UI", "details": "Sketch core screens." }
  },
  "columns": [
    { "id": "col-backlog", "title": "Backlog", "cardIds": ["card-1"] },
    { "id": "col-in-progress", "title": "In progress", "cardIds": ["card-2"] }
  ]
}
```

This shape is intentionally small and stable. The backend validates the top-level board shape before storing or returning AI board updates, then stores the validated board as one JSON blob.

## Database creation

A simple SQLite initialization routine should:

1. Create `users` if it does not exist.
2. Create `boards` if it does not exist.
3. Optionally create `conversations` if AI history storage is added.

## Implementation notes

- Use `TEXT` for `board_json` rather than SQLite native JSON to maximize compatibility.
- Use `FOREIGN KEY` constraints to link `boards.user_id` to `users.id`.
- Keep the first backend implementation focused on `GET /api/board/{user}` and `POST /api/board/{user}`.
- Docker start scripts set `PM_DB_PATH=/app/data/pm.db` and mount local `data/` so the SQLite file survives container recreation.
- Future enhancements may include persisting conversation rows in `conversations` or adding an `ai_requests` table.
