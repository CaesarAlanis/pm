# Database Design

SQLite database, stored at `data/pm.db` (mounted volume in Docker). Auto-created on first startup.

## Tables

### users

| Column        | Type    | Constraints                     |
|---------------|---------|---------------------------------|
| id            | TEXT    | PRIMARY KEY                     |
| username      | TEXT    | NOT NULL, UNIQUE                |
| password_hash | TEXT    | NOT NULL                        |
| created_at    | TEXT    | NOT NULL, DEFAULT datetime('now') |

MVP: single hardcoded user ("user" / "password"). Schema supports multiple users for future.

### boards

| Column     | Type    | Constraints                     |
|------------|---------|---------------------------------|
| id         | TEXT    | PRIMARY KEY                     |
| user_id    | TEXT    | NOT NULL, REFERENCES users(id)  |
| title      | TEXT    | NOT NULL, DEFAULT 'My Board'    |
| created_at | TEXT    | NOT NULL, DEFAULT datetime('now') |

MVP: one board per user. Future: multiple boards.

### columns

| Column   | Type    | Constraints                          |
|----------|---------|--------------------------------------|
| id       | TEXT    | PRIMARY KEY                          |
| board_id | TEXT    | NOT NULL, REFERENCES boards(id)      |
| title    | TEXT    | NOT NULL                             |
| position | INTEGER | NOT NULL, UNIQUE(board_id, position) |

`position` determines column order (0-indexed). No UNIQUE constraint on position -- ordering is managed by the application.

### cards

| Column     | Type    | Constraints                            |
|------------|---------|----------------------------------------|
| id         | TEXT    | PRIMARY KEY                            |
| column_id  | TEXT    | NOT NULL, REFERENCES columns(id)       |
| title      | TEXT    | NOT NULL                               |
| details    | TEXT    | NOT NULL, DEFAULT ''                   |
| position   | INTEGER | NOT NULL, UNIQUE(column_id, position)  |
| created_at | TEXT    | NOT NULL, DEFAULT datetime('now')      |

`position` determines card order within a column. No UNIQUE constraint -- ordering is managed by the application. Moving a card between columns updates `column_id` and `position`.

## Relationships

```
users 1--* boards
boards 1--* columns
columns 1--* cards
```

## Seed Data

On first startup for a new user, the board is seeded with:
- 5 columns: Backlog, Discovery, In Progress, Review, Done
- 8 sample cards across those columns

This matches the existing frontend `initialData` in `src/lib/kanban.ts`.

## ID Format

IDs use a prefix + random base36 string (e.g., `card-a1b2c3`, `col-x9y8z7`). This keeps IDs human-readable and avoids auto-increment exposure.
