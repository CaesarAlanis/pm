# Part 9 - Structured AI Board Operations

## Objective

Send board JSON + user prompt + session chat history to AI and receive structured output containing a user-facing message and optional board operations.

## Proposed Structured Output Contract

```json
{
  "assistant_message": "string",
  "operations": [
    {
      "type": "create_card | update_card | move_card | delete_card | rename_column",
      "column_id": "string optional",
      "card_id": "string optional",
      "title": "string optional",
      "details": "string optional",
      "target_column_id": "string optional",
      "target_index": "integer optional",
      "new_title": "string optional"
    }
  ]
}
```

Notes:

- `assistant_message` is always required.
- `operations` is optional and defaults to an empty list.
- Backend validates operations before applying changes.

## Checklist

- [ ] Define Pydantic models for request and response schema.
- [ ] Include board JSON, user message, and in-memory session history in AI request.
- [ ] Keep conversation history only for active server session (no DB persistence).
- [ ] Validate structured output strictly before mutation.
- [ ] Apply valid operations transactionally and return updated board snapshot.
- [ ] Return assistant text even when no operation is applied.

## Tests

- [ ] pytest: schema validation accepts valid responses and rejects invalid shapes.
- [ ] pytest: each operation type mutates board correctly.
- [ ] pytest: malformed operation payloads are rejected safely.
- [ ] pytest: chat history resets when session restarts.
- [ ] integration: AI response with operations updates persisted board.

## Success Criteria

- AI interactions produce deterministic, validated responses.
- Optional board updates are safely applied and persisted.
- Session-only chat memory behavior is enforced.

## Out of Scope

- Long-term conversation storage and user-specific AI memory.