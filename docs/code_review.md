# Code Review Report

**Date:** 2026-05-13
**Scope:** Full repository -- backend (Python/FastAPI), frontend (Next.js/React), infrastructure (Docker)

---

## Summary

The project is in good shape overall. The codebase is well-structured, split into clear packages, and covers the MVP requirements. Many issues from an earlier review have been addressed (authorization checks, stale closure fixes, debounced renames, Pydantic validation, rate limiting, JWT sessions, WAL mode, etc.).

| Severity | Count |
|----------|-------|
| Critical | 3 |
| High | 3 |
| Medium | 3 |
| Low | 5 |

---

## Critical Issues

### C1. Plaintext password in seed.sql

**File:** `backend/app/db/seed.sql:2`

The seed SQL stores `'password'` literally as the `password_hash` value. While the runtime auth code in `session.py` uses bcrypt correctly (hashing from env vars), the database bypasses this entirely on first startup. A user with DB access can read the plaintext password.

**Action:** Either:
- Hash the seed password at startup (modify `seed_db_if_empty` to hash before inserting), or
- Only seed the user from environment variables at first run (the current approach in `session.py`), and treat `seed.sql` as a development-only convenience without real credentials.

---

### C2. AI board update is destructive with no user confirmation

**File:** `backend/app/db/board.py:34-61`

`apply_board_update()` deletes all columns and cards for a board before re-inserting from the AI response. This happens within a single request with no confirmation step. If the AI returns malformed or partial data (omit a column, etc.), the user's board is silently modified.

**Mitigations in place:**
- BoardUpdate is validated with Pydantic before applying (in `routes/ai.py:79`)
- The operation is wrapped in `BEGIN IMMEDIATE` / rollback on failure
- Ownership is verified via `board_id_for_user`

**Still risky:** The AI could return a valid structure that accidentally drops cards (e.g., hallucinating columns without cards). The user sees a "Board updated" checkmark and cannot undo.

**Action:** Add a preview/confirmation step in the frontend before applying AI-driven board changes. At minimum, return a diff summary so the frontend can show what changed.

---

### C3. Real API key in .env checked into repository tracking

**File:** `.env`

Contains a real OpenRouter API key. While `.gitignore` excludes `.env`, verify it was never committed to git history. The `.env.example` file documents the required variables but does not document which model is set.

**Action:**
1. Verify `.env` is not tracked: `git ls-files .env`
2. If it was ever committed, rotate the key at OpenRouter
3. Add `AI_MODEL` to `.env.example` so new contributors know the default

---

## High Issues

### H1. JWT revocation list is in-memory, lost on restart

**File:** `backend/app/session.py:19-20`

`_revoked_tokens: set[str]` stores tokens invalidated via logout. This is lost on server restart, meaning previously logged-out tokens become valid again.

**Mitigation:** JWT has a 24-hour TTL, so the impact is limited to tokens expiring naturally. For an MVP this is acceptable but should be documented.

**Action:** Document this behavior. For production, use a persistent revocation store (database-backed blacklist or short-lived access tokens with refresh tokens).

---

### H2. Client-generated card IDs sent to server

**Files:** `frontend/src/lib/kanban.ts:164-166`, `frontend/src/components/KanbanBoard.tsx:139`

`createId()` generates IDs client-side using `crypto.randomUUID().slice(0, 8)` and sends them to the server via `POST /boards/cards`. If the randomly generated ID collides with an existing ID, the INSERT fails with a UNIQUE constraint violation and the user sees "Failed to add card."

**Mitigation:** `crypto.randomUUID()` produces a UUID v4 (122 bits of entropy); taking 8 hex chars gives 32 bits -- still very low collision probability for an MVP. But there is no server-side fallback or retry.

**Action:** Have the server generate the ID and return it, or at minimum catch the integrity error and retry with a new ID server-side.

---

### H3. Port mismatch between start scripts and docker-compose

**Files:** `scripts/start.sh:5`, `docker-compose.yml:5`

Start scripts print `http://localhost:8000` but docker-compose maps port `3000:8000`. The app is actually available at port 3000.

**Action:** Align these. Either change the script to say port 3000 or change the docker-compose mapping to `8000:8000`.

---

## Medium Issues

### M1. AI response sanitization is minimal defense-in-depth

**File:** `backend/app/ai/chat.py:32-36`

`_sanitize_message()` strips `<script>` tags and all HTML tags from AI messages. This is defense-in-depth since React escapes content by default. However, the sanitization is simplistic -- it does not handle edge cases like:
- Obfuscated HTML (`<scr<script>ipt>`)
- Non-HTML injection vectors
- Markdown that React might render differently

**Action:** Consider using a proper HTML sanitizer (e.g., `bleach` in Python) if AI output is ever rendered as HTML in the future. For the MVP, the current approach is acceptable.

---

### M2. Optimistic update rollbacks now show error but previous error is lost on new error

**File:** `frontend/src/components/KanbanBoard.tsx:39,103-104,133,166,191`

The `error` state is a single string. If one request fails (showing "Failed to move card...") and another fails before the user dismisses the first, the message is silently overwritten.

**Action:** Use a queue or array for error messages, or add a toast notification system.

---

### M3. Logout succeeds locally even if server request fails

**File:** `frontend/src/lib/auth.tsx` -- the logout handler catches errors and clears local state regardless of server response. This means the session cookie remains valid on the server even though the frontend shows the user as logged out.

**Action:** On server failure, either warn the user or retry the request.

---

## Low Issues

### L1. DATABASE.md has contradictory UNIQUE constraint documentation

**File:** `docs/DATABASE.md:36-51`

The `columns` table doc says `UNIQUE(board_id, position)` and the `cards` table says `UNIQUE(column_id, position)`, but both rows also say "No UNIQUE constraint -- ordering is managed by the application." The actual schema has no UNIQUE constraints on position. This is contradictory.

**Action:** Remove the `UNIQUE(...)` text from the documentation tables to match the actual schema.

---

### L2. AI_MODEL default value inconsistency

**Files:** `AGENTS.md:27`, `backend/app/ai/client.py:7`, `.env`

`AGENTS.md` and `.env` specify `z-ai/glm-5.1`, but the code default in `client.py` is `z-ai/glm-4.5-air:free`. The `.env` file sets AI_MODEL to `z-ai/glm-5.1` which overrides the default. This is not a runtime bug but is confusing for new contributors who only read `AGENTS.md`.

**Action:** Update `AGENTS.md` to mention `glm-4.5-air:free` as the code default, or change the code default to match.

---

### L3. Backend AGENTS.md is outdated

**File:** `backend/AGENTS.md`

The documentation describes the old structure with `app/routes.py` and `app/db.py` as single files. The actual codebase has these split into packages (`app/routes/` and `app/db/`). The file also lists `db.py` under the structure but no longer references the package modules.

**Action:** Update the backend AGENTS.md to reflect the current package structure.

---

### L4. Weak default JWT_SECRET

**File:** `backend/app/session.py:7`

```python
JWT_SECRET = os.environ.get("JWT_SECRET", "change-me-in-production-use-32-bytes")
```

If the env var is not set, the JWT secret is literally the string `"change-me-in-production-use-32-bytes"`. This is documented as a placeholder but is used without warning.

**Action:** Log a warning at startup if the default secret is used, or validate that `JWT_SECRET` is not the default value.

---

### L5. CSRF middleware returns JSON for all non-API routes too

**File:** `backend/main.py:29-37`

The CSRF middleware only blocks requests to `/api/*` (excluding health/hello). Non-API paths pass through. This is correct for the current setup where only API routes need CSRF protection. Not a bug, but worth noting that the middleware returns `media_type="application/json"` for blocked requests regardless of the request's Accept header.

---

## Previously Fixed Issues (for reference)

Many issues from earlier reviews have been addressed:

| Issue | Status |
|-------|--------|
| No authorization checks | Fixed -- all mutations use `user_owns_column`/`user_owns_card` |
| Stale closure rollbacks | Fixed -- captured inside functional updater |
| Column rename on every keystroke | Fixed -- debounced at 400ms |
| apiToBoardData not sorting | Fixed -- sorts by position |
| Missing secure cookie flag | Fixed -- configurable via `COOKIE_SECURE` env var |
| SQLite concurrency | Fixed -- WAL mode + BEGIN IMMEDIATE |
| Redundant ensure_db on login | Fixed -- only called in lifespan |
| Docker running as root | Fixed -- uses non-root `appuser` |
| Missing login accessibility | Fixed -- proper labels, autocomplete, ids |
| No CSRF protection | Fixed -- `X-Requested-With` header on all mutating requests |
| No Pydantic models | Fixed -- all request bodies use Pydantic |
| No rate limiting | Fixed -- slowapi configured on login and AI endpoints |
| Array index as React key | Fixed -- uses `msg.id` with `crypto.randomUUID()` |
| Missing indexes | Fixed -- indexes exist in schema.sql |
| Missing __init__.py | Fixed -- exists with exports |
| Blanket *.md dockerignore | Fixed -- specific exclusions |
| Missing .gitignore entries | Fixed -- frontend artifacts covered |
| Docker healthcheck missing | Fixed -- added to docker-compose.yml |

---

## Strengths

1. **Clean separation of concerns:** Backend split into `routes/`, `db/`, `ai/` packages. Frontend has clear component hierarchy.
2. **Ownership enforcement:** All database mutations verify user ownership via JOINs through the board hierarchy.
3. **Optimistic updates with proper rollback:** The functional updater pattern correctly captures previous state for rollback.
4. **Security fundamentals:** CSRF protection, httponly cookies, rate limiting, JWT with TTL, Pydantic validation.
5. **Test coverage:** Both backend (pytest) and frontend (vitest + Playwright) have solid coverage.
6. **Normalized data model on frontend:** Cards stored in flat map, columns reference by ID array -- avoids nested state issues.
7. **Pure moveCard function:** Decoupled from React, making it testable and reusable.
8. **Docker best practices:** Multi-stage build, non-root user, uv for fast Python dependency management.

---

## Recommendations

1. **Short term:** Fix C1 (seed.sql plaintext password), align script port with docker-compose (H3), and rotate the API key if it was ever committed (C3).
2. **Medium term:** Add server-side ID generation (H2), document the in-memory revocation limitation (H1), and improve error feedback (M2).
3. **Documentation updates:** Fix the AGENTS.md files to reflect current structure (L3) and correct DATABASE.md contradictions (L1).
