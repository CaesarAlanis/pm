# Part 10 - AI Sidebar UX and Live Board Updates

## Objective

Add a high-quality AI chat sidebar that displays conversation and reflects AI-driven board updates immediately.

## Checklist

- [ ] Implement sidebar layout integrated with current board page.
- [ ] Add chat input, message history view, submit/loading/error states.
- [ ] Call backend AI endpoint with user prompts.
- [ ] Render assistant response text in chat panel.
- [ ] When operations are returned, refresh or update board automatically.
- [ ] Keep UI responsive on desktop and mobile breakpoints.

## Tests

- [ ] vitest: sidebar state transitions (idle/loading/success/error).
- [ ] vitest: operation result triggers board state refresh.
- [ ] playwright: end-to-end chat message flow visible in sidebar.
- [ ] playwright: AI-triggered board changes appear without manual reload.

## Success Criteria

- Sidebar chat is functional and visually integrated.
- AI text and board updates are both visible to the user in one flow.
- Core board interactions remain stable.

## Out of Scope

- Multi-user realtime chat sync.