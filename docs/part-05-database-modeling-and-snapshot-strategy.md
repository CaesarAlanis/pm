# Part 5 - Database Modeling and Snapshot Strategy

## Objective

Define and document SQLite schema for normalized Kanban persistence plus JSON snapshots, then secure sign-off before implementation.

## Checklist

- [ ] Propose normalized tables:
  - [ ] `users`
  - [ ] `boards`
  - [ ] `columns`
  - [ ] `cards`
- [ ] Define foreign keys, constraints, ordering columns, and key indexes.
- [ ] Define JSON snapshot storage strategy (for example board-level snapshot table).
- [ ] Define migration/bootstrap approach for first-run database creation.
- [ ] Document schema and rationale in `docs/`.
- [ ] Request explicit user approval of schema before coding Part 6.

## Tests

- [ ] Review-based validation that schema supports required board operations.
- [ ] Review-based validation that one user maps to one board in MVP while allowing future expansion.
- [ ] Review-based validation that snapshots can reconstruct board state.

## Success Criteria

- Schema design is approved and documented.
- Data model supports both normalized CRUD and snapshot-based board serialization.

## Out of Scope

- Full migration framework rollout (unless needed minimally in Part 6).