# Part 3 - Integrate Frontend Runtime

## Objective

Run the existing Kanban frontend through the containerized runtime path so `/` serves the current board UI through FastAPI -> Next.js.

## Checklist

- [x] Integrate the existing `frontend/` app into Docker build/runtime workflow.
- [x] Ensure production Next.js runtime process is used (`next build` + `next start`).
- [x] Wire FastAPI proxy to route UI requests to Next.js runtime.
- [x] Preserve current Kanban behavior (rename columns, add/remove cards, drag/drop cards).
- [x] Ensure frontend tests remain runnable.

## Tests

- [x] Frontend unit tests pass (`vitest`).
- [x] Frontend e2e tests pass (`playwright`) against containerized runtime.
- [x] Manual smoke test confirms board renders at `/` with 5 columns.
- [x] Manual smoke test confirms drag/drop and add/remove card behavior still works.

## Success Criteria

- Existing frontend demo is served at `/` through the backend proxy path.
- No behavior regressions in current Kanban interactions.

## Out of Scope

- Authentication, persistence, or AI functionality.