# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A Project Management MVP: a single-user (MVP scope) Kanban board with an AI chat sidebar that can create/edit/move cards. Full requirements, technical decisions, and color scheme live in `AGENTS.md` (root) — read it before making product decisions. The build is being executed in phases tracked in `docs/PLAN.md`; check that file for current phase/status before assuming a feature (auth, database, AI wiring) is finished.

Target architecture per `AGENTS.md`: NextJS frontend + Python FastAPI backend (serving the built static Next site at `/`), packaged as one Docker container, SQLite for storage, OpenRouter (`openai/gpt-oss-120b`) for AI calls, `uv` as the Python package manager in Docker.

**Current implementation state (important, don't assume otherwise):** `backend/app.py` is now a FastAPI app (module-level `app = FastAPI()`) with `/api/health` and `/api/chat` (still keyword-based fake replies — no SQLite, no OpenRouter call yet). `python3 backend/app.py` runs it via `uvicorn.run()` in-process, so the OS-level process still shows up as `python3 backend/app.py` (relevant for `scripts/stop.sh`'s pkill pattern, see below). `backend/tests/test_chat.py` imports `from backend.app import app` and passes.

The frontend Kanban board (`frontend/`) is a working, self-contained demo: board state lives in React state (`KanbanBoard.tsx`), not persisted to any backend yet. Sign-in is a hardcoded `user`/`password` check in client state (not real auth). `ChatPanel.tsx` calls `POST /api/chat` and expects `{ reply, updated_board? }`; `next.config.ts` rewrites `/api/:path*` to `http://127.0.0.1:8000/api/:path*` (the Python backend) in dev.

## Commands

### Frontend (`frontend/`)
```bash
npm install
npm run dev            # Next dev server on :3000, proxies /api/* to :8000
npm run build
npm run lint
npm run test:unit          # vitest run
npm run test:unit:watch    # vitest watch
npm run test:e2e           # playwright (auto-starts dev server on 127.0.0.1:3000)
npm run test:all           # unit then e2e
```
Run a single vitest file/test: `npx vitest run src/components/KanbanBoard.test.tsx` or `npx vitest run -t "test name"`.
Run a single playwright test: `npx playwright test tests/kanban.spec.ts -g "test name"`.
Unit tests (vitest, jsdom) live alongside source as `*.test.tsx`/`*.test.ts`; e2e tests (Playwright) live in `frontend/tests/`. Don't put Playwright specs under `src/` — vitest's `include` is `src/**/*.{test,spec}.{ts,tsx}` and explicitly excludes `tests/`.

### Backend (`backend/`)
```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r backend/requirements.txt
python3 backend/app.py           # runs the current stdlib server on :8000
```
Backend tests use `unittest`/FastAPI's `TestClient` (`backend/tests/test_chat.py`) — run with `python -m pytest backend/tests/` or `python -m unittest discover backend/tests`.

### Local dev (both services)
```bash
scripts/start.sh   # creates/activates .venv, starts backend (:8000) and frontend (:3000) in background, logs to /tmp/pm-backend.log and /tmp/pm-frontend.log
scripts/stop.sh     # kills uvicorn and next dev processes
```
Note: `scripts/start.sh` launches the backend with `python3 backend/app.py` (which runs `uvicorn.run()` in-process); `scripts/stop.sh` pkills on `"backend/app.py"` to match that process's actual command line.

## Architecture notes

- **Board data model** (`frontend/src/lib/kanban.ts`): a `BoardData` is `{ columns: Column[], cards: Record<string, Card> }` — columns hold ordered `cardIds`, cards are looked up by id. `moveCard(columns, activeId, overId)` is the single pure function handling both same-column reorder and cross-column move logic for drag-and-drop; it's the place to change if drop behavior needs adjusting. It's unit-tested directly in `kanban.test.ts` — prefer testing move logic there over through the DnD component.
- **Drag and drop**: `@dnd-kit/core` in `KanbanBoard.tsx` — `DndContext` wraps the columns, `handleDragEnd` calls `moveCard` and replaces `board.columns`. `KanbanCardPreview` renders the `DragOverlay` ghost.
- **Chat → board update contract**: `ChatPanel` posts `{ message, board }` to `/api/chat` and merges back `data.updated_board` into board state via `onBoardUpdate` (passed down from `KanbanBoard`). Any backend chat implementation must honor this shape (`reply: string`, optional `updated_board: BoardData`) for the frontend to pick up AI-driven board edits.
- **Styling**: Tailwind v4 (`@import "tailwindcss"` in `globals.css`, no separate config file) with the brand palette defined as CSS custom properties in `globals.css` (`--accent-yellow`, `--primary-blue`, `--secondary-purple`, `--navy-dark`, `--gray-text`) matching the values in `AGENTS.md`. Reference these vars (`var(--navy-dark)` etc.) rather than hardcoding hex values.
- **E2e hooks**: Playwright tests rely on `data-testid` attributes (`column-<id>`, `card-<id>`) on the Kanban components — preserve these when refactoring markup.
- Each of `backend/`, `scripts/`, and `frontend/` has (or is intended to have) its own `AGENTS.md` describing that subtree; `backend/AGENTS.md` and `scripts/AGENTS.md` are currently placeholders and should be filled in as those areas are built out.

## Coding standards (from AGENTS.md)

- Use latest, idiomatic versions of libraries.
- Keep it simple — no over-engineering, no unnecessary defensive programming, no speculative features.
- Keep docs/README minimal. No emojis, ever.
- When debugging, find the root cause with evidence before fixing — don't guess-and-check.
