# Part 6 - Backend API for Kanban Persistence

## Objective

Implement backend endpoints to read and mutate Kanban data for the authenticated user, backed by SQLite with auto-create behavior.

## Checklist

- [x] Add SQLite initialization on backend startup if DB file does not exist.
- [x] Implement data access layer for normalized tables and snapshot updates.
- [x] Add token auth guard for Kanban endpoints.
- [x] Add endpoints for:
  - [x] Fetch board state
  - [x] Rename columns
  - [x] Create/edit/delete cards
  - [x] Move cards between columns
- [x] Ensure mutation endpoints keep normalized data and snapshot data in sync.
- [x] Add backend API error handling for invalid operations.

## Tests

- [x] pytest: database bootstrap creates schema on empty environment.
- [x] pytest: authenticated board fetch returns expected shape.
- [x] pytest: each mutation endpoint updates database correctly.
- [x] pytest: unauthorized requests are rejected.
- [x] pytest: invalid payloads produce expected error responses.

## Success Criteria

- API supports full board CRUD/move behaviors for MVP user.
- Database is created automatically when missing.
- Backend behavior is covered by pytest and deterministic.

## Out of Scope

- Batch multi-board collaboration and permissions model.