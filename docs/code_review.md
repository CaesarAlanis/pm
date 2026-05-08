# Code review

Reviewed: 2026-05-07  
Scope: entire repository (backend, frontend, tests, infra)

---

## Summary

The codebase is clean and well-structured for an MVP. The separation of concerns is clear, the test coverage is good, and the Docker setup is production-ready. The issues below are ranked by severity: **high**, **medium**, and **low**.

No high-severity issues were found.

---

## Medium severity

### 1. Column rename fires a backend POST on every keystroke

**File:** `frontend/src/components/KanbanColumn.tsx:43`, `frontend/src/components/KanbanBoard.tsx:111-118`

The column title `<input>` calls `onRename` on every `onChange`, which immediately calls `updateBoard`, which calls `saveBoard` (an HTTP POST). Renaming a 10-character column name fires 10 requests. This is wasteful and can cause race conditions where an earlier request resolves after a later one, leaving stale data in the DB.

**Action:** Debounce `saveCurrentBoard` (300–500 ms) or only persist on `onBlur`.

---

### 2. `response_format: json_object` is not reliably honoured by free OpenRouter models

**File:** `backend/ai.py:71-75`

The request payload passes `"response_format": {"type": "json_object"}` to every model, including the free Gemma fallbacks. Many free models on OpenRouter ignore this field and return plain text or markdown-wrapped JSON. When they do, `_extract_json_object` strips code fences, but plain prose responses will still raise `json.JSONDecodeError`, returning a 502 to the user with no useful message.

**Action:** Catch `json.JSONDecodeError` separately from the generic `Exception` in the `chat` route and return a more descriptive 502 detail (e.g., `"AI returned a non-JSON response"`). Consider also logging the raw response for debugging.

---

### 3. Silent swallow of the initial board seed error

**File:** `frontend/src/components/KanbanBoard.tsx:49`

```ts
void saveBoard(username, nextBoard);
```

When a new user's board is empty, the frontend seeds it with `initialData` and fires `saveBoard` as a fire-and-forget. If this call fails (network error, backend down), the user sees their default board but it is never persisted. On reload, the backend returns an empty board again, and the seed fires again — silently looping. No error is surfaced to the user.

**Action:** `await` the seed call inside `loadBoard` and propagate any error through `setError`.

---

### 4. `_validated_board_or_default` can silently discard a user's saved board

**File:** `backend/main.py:108-114`

If the board JSON stored in the database fails Pydantic validation (e.g. after a schema change or a manual DB edit), `GET /api/board/{username}` silently returns an empty default board. The caller has no way to know their real data was discarded, and the next `POST /api/board/{username}` will overwrite the corrupt-but-salvageable data.

**Action:** Either raise a 500 with a clear error, or at minimum log a warning before falling back. The silent discard is the problematic part.

---

## Low severity

### 5. AI request timeout is short for free-tier models

**File:** `backend/ai.py:69`

`timeout=12.0` seconds. Free-tier models on OpenRouter frequently queue for 15–30 seconds under load. The result is a 502 that gives no indication the request timed out vs. a model error.

**Action:** Raise to `30.0` seconds, or surface timeout errors as a distinct message (e.g., `"AI request timed out — try again"`).

---

### 6. `backend/pm.db` is committed to the repository

**File:** `./backend/pm.db`

The SQLite database file is present in the repo. Even if empty now, committing a database file risks including real user data in future commits.

**Action:** Add `backend/pm.db` and `data/pm.db` to `.gitignore` and remove `backend/pm.db` from git tracking (`git rm --cached backend/pm.db`).

---

### 7. CLAUDE.md documents the wrong backend test command

**File:** `CLAUDE.md`

CLAUDE.md says to run backend tests with `python -m pytest tests/`. `pytest` is not a declared dependency (it is not in `backend/pyproject.toml`) and the tests use stdlib `unittest`. The correct command (as confirmed by test runs) is:

```bash
python -m unittest discover -s backend/tests -v
```

run from the **project root** so the `backend` package is importable. Running from inside `backend/` causes `ModuleNotFoundError: No module named 'backend'`.

**Action:** Fix the command in CLAUDE.md. Optionally add `pytest` to dev dependencies to make either form work.

---

### 8. `password.trim()` in login validation

**File:** `frontend/src/components/LoginScreen.tsx:21`

The login handler trims both username and password before comparing. Trimming passwords silently discards leading/trailing whitespace that users may have intentionally typed. For a hardcoded dummy password this causes no real issue, but the pattern should not be carried forward if real authentication is ever added.

**Action:** Remove `.trim()` from the password comparison.

---

### 9. `details` default is inconsistent between frontend and backend

**File:** `frontend/src/components/KanbanBoard.tsx:131`, `backend/main.py:27`

When a card is added without details, the frontend stores `"No details yet."`:
```ts
details: details || "No details yet."
```
The backend `CardModel` defaults `details` to `""`. The AI can also create cards with `details: ""`. This means the board can have a mix of empty strings and placeholder text depending on who created the card.

**Action:** Standardise to `""`. Remove the `|| "No details yet."` fallback in the frontend.

---

### 10. No in-flight AI request cancellation

**File:** `frontend/src/components/KanbanBoard.tsx:155-187`

Once an AI request is in flight, there is no way to cancel it. If the AI is slow (common with free-tier models), the user is stuck with a disabled Send button and a `...` label until the request resolves or errors. There is no timeout surfaced to the UI.

**Action:** For now, a simple improvement is to add a visible loading message in the chat panel (e.g., "Thinking...") so the user knows the request is in progress. A Cancel button with `AbortController` would be the full fix.

---

### 11. Chat key uses array index, which can shift on re-render

**File:** `frontend/src/components/KanbanBoard.tsx:306`

```tsx
key={`${message.role}-${index}`}
```

Using the array index as part of a key means React may reuse DOM nodes incorrectly if messages are ever prepended or removed. For a simple append-only list this works today, but it is not robust.

**Action:** Assign a stable ID to each message when it is created (e.g., `createId("msg")`).

---

### 12. `cards.map((cardId) => board.cards[cardId])` is not guarded

**File:** `frontend/src/components/KanbanBoard.tsx:268`

```tsx
cards={column.cardIds.map((cardId) => board.cards[cardId])}
```

If a `cardId` in a column does not exist in `board.cards`, this produces `undefined` in the array, which will crash `KanbanCard`. The backend validates this on write, but local client-side state (e.g. a partial AI board update that passes backend validation but has some edge case) could produce this situation.

**Action:** Filter out missing cards: `.map(...).filter(Boolean)` or assert the card exists and log an error.

---

## Informational (no action required)

**AI conversation design:** In `handleChatSubmit`, `chatMessages` (the history *before* the current message) is passed as `conversation`, and `nextMessage` is passed as `message`. This is correct and intentional — the backend prompt separates history from the current input.

**SQLite `check_same_thread=False`:** Used in `db.py`. This is safe for FastAPI's async model where DB calls are made from async route handlers (not from multiple threads simultaneously). No action needed.

**No card edit in place:** Cards can be added and deleted but not edited after creation. The AI can update card content via `boardUpdate`. This is a known MVP scope decision.

**CORS origins:** `main.py` allows CORS from `localhost:3000` for dev mode. In production (Docker), the frontend is served from the same origin and CORS is irrelevant. This does not cause a problem but could be tightened if dev mode access needs to be locked down.
