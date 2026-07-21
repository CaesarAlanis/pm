# Database Schema & Data Modeling

## Overview

The application uses an SQLite local database stored at `data/app.db` (or relative path). If the database file does not exist, the backend automatically creates it and runs initial migrations on startup.

## ERD & Tables

### 1. `users`
Stores user accounts. Supports multi-user design although MVP hardcodes initial account `user`.
- `id` (TEXT PRIMARY KEY)
- `username` (TEXT UNIQUE NOT NULL)
- `password` (TEXT NOT NULL)
- `created_at` (DATETIME DEFAULT CURRENT_TIMESTAMP)

### 2. `boards`
Stores Kanban boards associated with users. (MVP enforces 1 board per user).
- `id` (TEXT PRIMARY KEY)
- `user_id` (TEXT NOT NULL, FOREIGN KEY -> `users(id)`)
- `title` (TEXT NOT NULL)
- `created_at` (DATETIME DEFAULT CURRENT_TIMESTAMP)

### 3. `columns`
Stores columns belonging to a board.
- `id` (TEXT PRIMARY KEY)
- `board_id` (TEXT NOT NULL, FOREIGN KEY -> `boards(id)`)
- `title` (TEXT NOT NULL)
- `position` (INTEGER NOT NULL)

### 4. `cards`
Stores cards belonging to columns.
- `id` (TEXT PRIMARY KEY)
- `column_id` (TEXT NOT NULL, FOREIGN KEY -> `columns(id)`)
- `title` (TEXT NOT NULL)
- `details` (TEXT NOT NULL)
- `position` (INTEGER NOT NULL)
- `created_at` (DATETIME DEFAULT CURRENT_TIMESTAMP)

---

## JSON Board Representation

For API exchanges and AI model reasoning (Gemini Structured Outputs), the complete board is serialized to the following JSON structure:

```json
{
  "user_id": "user",
  "board_id": "board-user",
  "title": "Kanban Studio",
  "columns": [
    {
      "id": "col-backlog",
      "title": "Backlog",
      "cardIds": ["card-1", "card-2"]
    },
    {
      "id": "col-discovery",
      "title": "Discovery",
      "cardIds": ["card-3"]
    },
    {
      "id": "col-progress",
      "title": "In Progress",
      "cardIds": ["card-4", "card-5"]
    },
    {
      "id": "col-review",
      "title": "Review",
      "cardIds": ["card-6"]
    },
    {
      "id": "col-done",
      "title": "Done",
      "cardIds": ["card-7", "card-8"]
    }
  ],
  "cards": {
    "card-1": {
      "id": "card-1",
      "title": "Align roadmap themes",
      "details": "Draft quarterly themes with impact statements and metrics."
    }
  }
}
```
