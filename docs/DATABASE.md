# Database approach

This project uses SQLite with one board per user. The schema separates users,
boards, columns, and cards to keep ordering explicit and make future multi-board
support straightforward.

## Entities

- `users`: account identities. For the MVP, credentials are fixed but the table
  supports multiple users.
- `boards`: one board per user (enforced by a unique constraint on `user_id`).
- `columns`: ordered lists within a board. Renaming is stored directly on the
  column record.
- `cards`: ordered items within a column.

## Keys and ordering

- Use UUIDs as primary keys.
- Use `position` integers for ordering columns within a board and cards within a
  column.
- Store `created_at` timestamps for future auditability.

## Relationships

- `boards.user_id` references `users.id`.
- `columns.board_id` references `boards.id`.
- `cards.column_id` references `columns.id`.

## Schema reference

See `docs/kanban.schema.json` for the JSON Schema definition of the data model.
