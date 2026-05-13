# Code Review

**Date:** 2026-05-13
**Scope:** Full repository -- backend (Python/FastAPI), frontend (Next.js/React), infrastructure (Docker)

---

## Summary

The codebase is well-structured with clear separation of concerns, proper ownership enforcement, and solid security fundamentals (CSRF, httponly cookies, rate limiting, JWT, Pydantic validation). Many issues from prior reviews have been fixed. The remaining issues are organized below.

| Severity | Count |
|----------|-------|
| Critical | 5 |
| High | 7 |
| Medium | 9 |
| Low | 5 |

---

## Critical Issues

### C1. Plaintext password in seed.sql

**File:** `backend/app/db/seed.sql:2`

The seed SQL stores `'password'` literally in the `password_hash` column. The runtime auth code uses bcrypt correctly, but the database bypasses this on first startup. The `seed_db_if_empty` function in `connection.py` executes this SQL directly without hashing.

**Fix:** Hash the seed password in Python during seeding:
```python
password_hash = bcrypt.hashpw(b"password", bcrypt.gensalt()).decode()
conn.execute("INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)", ...)
```

---

### C2. AI board update is destructive with no user confirmation

**File:** `backend/app/db/board.py:34-61`

`apply_board_update()` deletes all columns and cards before re-inserting from the AI response. If the AI hallucinates and omits cards, they are permanently deleted with no undo. Pydantic validation and `BEGIN IMMEDIATE` mitigate some risk, but the AI could return a valid structure that accidentally drops data.

**Fix:** Add a preview/confirmation step in the frontend before applying AI-driven board changes. At minimum, return a diff summary so the user can see what changed.

---

### C3. SQLite database files tracked in git

**Files:** `data/pm.db`, `backend/data/pm.db` (both show as modified in git status)

The `.gitignore` does not exclude `data/` or `*.db` at the project root. Tracking a SQLite database means user data, credentials, and binary merge conflicts are committed to version control. (Note: `.env` is correctly gitignored and the API key is not exposed.)

**Fix:** Add to `.gitignore`:
```
data/
*.db
*.db-journal
*.db-wal
*.db-shm
```
Then run `git rm --cached data/pm.db backend/data/pm.db`.

---

### C4. Race condition in move_card produces duplicate positions

**File:** `backend/app/db/card.py:53-101`

When moving a card backward within the same column, the gap-close and make-room operations conflict. The gap-close decrements positions after `src_pos`, then make-room increments positions at `>= target_position`. A card that was decremented and then incremented can end up with the same position as another card.

Example: moving card from position 3 to position 1 in a column with 5 cards -- after both shift operations, two cards will share position 3.

**Fix:** When `src_col == target_column_id`, temporarily set the moving card to position -1 before shift operations, then place it at the target position.

---

### C5. JWT secret has insecure fallback, missing from .env.example

**File:** `backend/app/session.py:7`

```python
JWT_SECRET = os.environ.get("JWT_SECRET", "change-me-in-production-use-32-bytes")
```

The default is a human-readable string committed in source code. `.env.example` does not document `JWT_SECRET`, so deployers will likely miss it. Anyone who reads the source can forge valid JWTs.

**Fix:** Add `JWT_SECRET` to `.env.example` and fail fast at startup if the default is in use:
```python
JWT_SECRET = os.environ.get("JWT_SECRET")
if not JWT_SECRET or JWT_SECRET == "change-me-in-production-use-32-bytes":
    raise RuntimeError("JWT_SECRET must be set to a secure random value")
```

---

## High Issues

### H1. Delete button inside drag handle causes accidental deletes

**File:** `frontend/src/components/KanbanCard.tsx:21-49`

`{...listeners}` from `useSortable` is spread on the entire card, making it a drag handle. The "Remove" button is inside this handle. A click that includes slight pointer movement (>= 6px) can trigger both a drag and a delete, with no confirmation dialog.

**Fix:** Add `onPointerDown={(e) => e.stopPropagation()}` to the Remove button.

---

### H2. Stale closure in optimistic updates

**File:** `frontend/src/components/KanbanBoard.tsx:84-85, 141, 171`

`moveCard` is called with the stale `board.columns` from the render closure, not the latest state from inside `setBoard`. Rapid drags produce incorrect state and send wrong positions to the API. The same pattern affects `handleAddCard` and `handleDeleteCard`.

**Fix:** Compute `moveCard` and target positions inside the `setBoard` updater where `prev` is the current state.

---

### H3. Port mismatch between start scripts and docker-compose

**Files:** `scripts/start.sh:5`, `scripts/start.bat:4`, `scripts/start.ps1:3`, `docker-compose.yml:5`

Start scripts print `http://localhost:8000` but docker-compose maps `3000:8000`. Users see a connection refused error.

**Fix:** Update all start scripts to show `http://localhost:3000`.

---

### H4. Client-generated card IDs are collision-prone

**File:** `frontend/src/lib/kanban.ts:164-166`

`createId` uses `crypto.randomUUID().slice(0, 8)` -- only 32 bits of entropy. With ~50,000 cards, there is a ~29% chance of collision. The server does not generate IDs or handle `IntegrityError` on collision.

**Fix:** Use the full UUID (`crypto.randomUUID()`) or have the server generate the ID and return it.

---

### H5. In-memory revoked token set grows without bound, lost on restart

**File:** `backend/app/session.py:19-20`

Every logout adds a JWT to `_revoked_tokens` with no eviction of expired tokens. On restart, all revocations are lost and previously logged-out tokens become valid again (within the 24-hour TTL).

**Fix:** Prune expired tokens on each revocation, and consider storing revocations in the database for persistence.

---

### H6. Volume mount overwrites Dockerfile ownership; appuser cannot write DB

**File:** `docker-compose.yml:9`, `Dockerfile:21-24`

The Dockerfile creates `appuser` and sets ownership of `/app/data`, but the bind mount overwrites these permissions. If `./data` doesn't exist before `docker compose up`, Docker creates it as root:root and the app crashes.

**Fix:** Ensure `./data` directory exists before starting (`mkdir -p data` in start scripts), or add an entrypoint that fixes ownership.

---

### H7. AI model name mismatch between .env.example and CLAUDE.md

**File:** `.env.example:2` says `z-ai/glm-4.5-air:free`, `CLAUDE.md:27` says `z-ai/glm-4.7-free`

These are different models. Anyone following the documented setup gets a different model than what the project spec prescribes.

**Fix:** Align `.env.example` with CLAUDE.md.

---

## Medium Issues

### M1. No input validation on card/column IDs from user input

**File:** `backend/app/routes/board.py:22-24`

The AI route validates column IDs with `^col-[a-z0-9-]+$`, but the user-facing board route accepts any arbitrary string with no format or length validation. A client can inject extremely long strings or IDs that conflict with the AI's naming convention.

**Fix:** Add `field_validator` for `id` and `column_id` fields, and add `max_length` constraints.

---

### M2. No React error boundary -- unhandled errors crash the entire app

**Files:** `frontend/src/components/KanbanBoard.tsx`, `frontend/src/lib/auth.tsx`

If `apiToBoardData` receives malformed data (e.g., `columns` is undefined), the entire component tree crashes with a white screen and no recovery. The app has no error boundary.

**Fix:** Add a React error boundary at the layout or page level. Wrap `apiToBoardData` in a try/catch with a meaningful fallback.

---

### M3. Error messages persist indefinitely with no auto-dismiss

**File:** `frontend/src/components/KanbanBoard.tsx:253-258`

Once an error is set, it stays until manually dismissed. Stale error messages from previous operations remain visible even after subsequent operations succeed. If a second error occurs before the first is dismissed, the first is silently overwritten.

**Fix:** Auto-dismiss errors after a timeout (e.g., 5 seconds), or clear errors on the next successful operation.

---

### M4. `apiToBoardData` mutates input via `.sort()`

**File:** `frontend/src/lib/kanban.ts:183-184`

`Array.prototype.sort()` mutates in place. Both `api.columns.sort()` and `col.cards.sort()` mutate the original `api` parameter, which is an unintended side effect.

**Fix:** Sort on copies: `[...api.columns].sort(...)` and `[...col.cards].sort(...)`.

---

### M5. `call_ai` crashes on unexpected API response shape

**File:** `backend/app/ai/client.py:29`

`data["choices"][0]["message"]["content"]` raises `KeyError` or `IndexError` if the OpenRouter API returns an unexpected shape (empty choices, null message). The error propagates as an opaque 502.

**Fix:** Add defensive access:
```python
choices = data.get("choices", [])
if not choices or "message" not in choices[0]:
    raise ValueError("Unexpected AI API response format")
return choices[0]["message"].get("content", "")
```

---

### M6. Missing accessibility: no aria-live on chat, no labels on NewCardForm

**Files:** `frontend/src/components/ChatSidebar.tsx:114-145`, `frontend/src/components/NewCardForm.tsx:27-44`

- Chat messages container has no `aria-live` attribute. Screen readers do not announce AI responses (WCAG 4.1.3).
- NewCardForm inputs rely solely on `placeholder` text with no `<label>` or `aria-label` (WCAG 1.3.1, 4.1.2). The login form does this correctly.

**Fix:** Add `aria-live="polite"` to the chat messages container. Add `aria-label` attributes to the card title and details inputs.

---

### M7. `ensure_db` race condition on startup

**File:** `backend/app/db/connection.py:39-41`

If two server processes start simultaneously, both see `count == 0` and both attempt the seed insert, causing a `UNIQUE constraint failed` error.

**Fix:** Wrap the seed in a try/except for `sqlite3.IntegrityError`.

---

### M8. No restart policy in docker-compose

**File:** `docker-compose.yml`

If the app crashes (unhandled exception, OOM, SQLite corruption), the container stops and remains stopped until manually restarted.

**Fix:** Add `restart: unless-stopped` to the app service.

---

### M9. Chat sidebar has no backdrop or Escape key handling

**File:** `frontend/src/components/ChatSidebar.tsx:94-98`

The sidebar slides over the board with no overlay/backdrop and no way to close it by clicking outside or pressing Escape. On smaller screens, the board's right side is inaccessible.

**Fix:** Add a semi-transparent backdrop that closes the sidebar on click, and add Escape key handling.

---

## Low Issues

### L1. Default auth credentials not documented in .env.example

**File:** `.env.example`

`AUTH_USERNAME` and `AUTH_PASSWORD` have fallback defaults in `session.py` but are not documented in `.env.example`. Operators may not know these can be changed.

**Fix:** Add both to `.env.example` with comments.

---

### L2. AI_MODEL default inconsistency across files

**Files:** `AGENTS.md:27`, `backend/app/ai/client.py:7`, `.env`

AGENTS.md specifies `z-ai/glm-4.7-free`, the code default is `z-ai/glm-4.5-air:free`, and `.env` may set a third value. Confusing for contributors.

**Fix:** Align all references to a single model identifier.

---

### L3. Backend AGENTS.md is outdated

**File:** `backend/AGENTS.md`

Describes the old structure with `app/routes.py` and `app/db.py` as single files. The actual codebase has these split into packages (`app/routes/` and `app/db/`).

**Fix:** Update to reflect the current package structure.

---

### L4. DATABASE.md has contradictory UNIQUE constraint documentation

**File:** `docs/DATABASE.md:36-51`

The documentation lists `UNIQUE(board_id, position)` and `UNIQUE(column_id, position)` but also says "No UNIQUE constraint -- ordering is managed by the application." The actual schema has no UNIQUE constraints on position.

**Fix:** Remove the `UNIQUE(...)` text to match the actual schema.

---

### L5. httpx AsyncClient created per request

**File:** `backend/app/ai/client.py:14`

`async with httpx.AsyncClient()` creates a new HTTP client per request with no connection pooling. Acceptable for the MVP but causes TCP churn under load.

**Fix:** Create a long-lived client at app startup and reuse it.

---

## Previously Fixed Issues

| Issue | Status |
|-------|--------|
| No authorization checks | Fixed -- all mutations verify ownership |
| Stale closure rollbacks | Fixed -- captured inside functional updater |
| Column rename on every keystroke | Fixed -- debounced at 400ms |
| apiToBoardData not sorting | Fixed -- sorts by position |
| Missing secure cookie flag | Fixed -- configurable via env var |
| SQLite concurrency | Fixed -- WAL mode + BEGIN IMMEDIATE |
| Docker running as root | Fixed -- non-root appuser |
| Missing login accessibility | Fixed -- labels, autocomplete, ids |
| No CSRF protection | Fixed -- X-Requested-With header |
| No Pydantic models | Fixed -- all request bodies validated |
| No rate limiting | Fixed -- slowapi on login and AI endpoints |
| Array index as React key | Fixed -- uses msg.id |
| Missing indexes | Fixed -- indexes in schema.sql |
| Docker healthcheck missing | Fixed -- added to docker-compose.yml |

---

## Strengths

1. **Clean separation of concerns** -- Backend split into `routes/`, `db/`, `ai/` packages; frontend has clear component hierarchy.
2. **Ownership enforcement** -- All database mutations verify user ownership via JOINs through the board hierarchy.
3. **Optimistic updates with proper rollback** -- Functional updater pattern correctly captures previous state.
4. **Security fundamentals** -- CSRF protection, httponly cookies, rate limiting, JWT with TTL, Pydantic validation.
5. **Test coverage** -- Both backend (pytest, 96% coverage) and frontend (vitest + Playwright) have solid coverage.
6. **Normalized data model** -- Cards in flat map, columns reference by ID array -- avoids nested state issues.
7. **Pure moveCard function** -- Decoupled from React, testable and reusable.
8. **Docker best practices** -- Multi-stage build, non-root user, uv for dependency management.

---

## Recommendations

**Short term (before next release):**
- Fix C1 (plaintext seed password), C3 (db files in git), C5 (JWT secret validation)
- Fix H1 (delete button propagation) and H3 (port mismatch) -- both are one-line fixes
- Fix H4 (use full UUIDs) -- small change, prevents data corruption

**Medium term:**
- Fix C4 (move_card same-column race condition) and C2 (AI board update confirmation)
- Fix H2 (stale closures in optimistic updates)
- Add React error boundary (M2)
- Add accessibility attributes (M6)

**Documentation:**
- Update AGENTS.md files (L2, L3) and DATABASE.md (L4)
- Add `JWT_SECRET`, `AUTH_USERNAME`, `AUTH_PASSWORD` to `.env.example` (L1)
