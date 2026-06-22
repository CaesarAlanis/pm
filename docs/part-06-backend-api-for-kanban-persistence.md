# Part 6 - Backend API for Kanban Persistence

## Objective

Implement backend endpoints to read and mutate Kanban data for the authenticated user, backed by SQLite with auto-create behavior.

## Checklist

- [ ] Add SQLite initialization on backend startup if DB file does not exist.
- [ ] Implement data access layer for normalized tables and snapshot updates.
- [ ] Add token auth guard for Kanban endpoints.
- [ ] Add endpoints for:
  - [ ] Fetch board state
  - [ ] Rename columns
  - [ ] Create/edit/delete cards
  - [ ] Move cards between columns
- [ ] Ensure mutation endpoints keep normalized data and snapshot data in sync.
- [ ] Add backend API error handling for invalid operations.

## Tests

- [ ] pytest: database bootstrap creates schema on empty environment.
- [ ] pytest: authenticated board fetch returns expected shape.
- [ ] pytest: each mutation endpoint updates database correctly.
- [ ] pytest: unauthorized requests are rejected.
- [ ] pytest: invalid payloads produce expected error responses.

## Success Criteria

- API supports full board CRUD/move behaviors for MVP user.
- Database is created automatically when missing.
- Backend behavior is covered by pytest and deterministic.

## Out of Scope

- Batch multi-board collaboration and permissions model.