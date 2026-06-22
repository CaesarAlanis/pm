# Part 7 - Frontend/Backend Integration

## Objective

Replace frontend-only board state with backend-backed persistence while keeping existing Kanban UX.

## Checklist

- [ ] Add frontend API client for authenticated backend requests.
- [ ] Load initial board state from backend after login.
- [ ] Replace local-only mutations with API-backed mutations.
- [ ] Add optimistic or immediate-refresh strategy with clear error handling.
- [ ] Keep component structure simple and aligned with existing app.

## Tests

- [ ] vitest: API client unit tests for request/response handling.
- [ ] vitest: board interaction tests mock backend responses.
- [ ] playwright: login + board load from persisted backend data.
- [ ] playwright: card/column changes persist across page reload.

## Success Criteria

- Board state is persistent via backend and survives reloads.
- Existing core interactions remain intact.

## Out of Scope

- Realtime collaboration and multi-tab conflict resolution.