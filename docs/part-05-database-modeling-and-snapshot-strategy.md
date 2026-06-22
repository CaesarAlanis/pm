# Part 5 - Database Modeling and Snapshot Strategy

## Objective

Define and document SQLite schema for normalized Kanban persistence plus JSON snapshots, then secure sign-off before implementation.

## Checklist

- [x] Propose normalized tables:
  - [x] `users`
  - [x] `boards`
  - [x] `columns`
  - [x] `cards`
- [x] Define foreign keys, constraints, ordering columns, and key indexes.
- [x] Define JSON snapshot storage strategy (for example board-level snapshot table).
- [x] Define migration/bootstrap approach for first-run database creation.
- [x] Document schema and rationale in `docs/`.
- [x] Request explicit user approval of schema before coding Part 6.

## Tests

- [x] Review-based validation that schema supports required board operations.
- [x] Review-based validation that one user maps to one board in MVP while allowing future expansion.
- [x] Review-based validation that snapshots can reconstruct board state.

## Success Criteria

- Schema design is approved and documented.
- Data model supports both normalized CRUD and snapshot-based board serialization.

## Out of Scope

- Full migration framework rollout (unless needed minimally in Part 6).