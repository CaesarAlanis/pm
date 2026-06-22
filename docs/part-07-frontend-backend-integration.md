# Part 7 - Frontend/Backend Integration

## Objective

Replace frontend-only board state with backend-backed persistence while keeping existing Kanban UX.

## Checklist

- [x] Add frontend API client for authenticated backend requests.
- [x] Load initial board state from backend after login.
- [x] Replace local-only mutations with API-backed mutations.
- [x] Add optimistic or immediate-refresh strategy with clear error handling.
- [x] Keep component structure simple and aligned with existing app.

## Tests

- [x] vitest: API client unit tests for request/response handling.
- [x] vitest: board interaction tests mock backend responses.
- [x] playwright: login + board load from persisted backend data.
- [x] playwright: card/column changes persist across page reload.

## Success Criteria

- Board state is persistent via backend and survives reloads.
- Existing core interactions remain intact.

## Out of Scope

- Realtime collaboration and multi-tab conflict resolution.