# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Kanban project management app with an AI chat sidebar. One board per user, hardcoded login (`user` / `password`). Runs locally in Docker.

## Commands

### Run the app (Docker)
```bash
./scripts/start.sh   # builds image, starts container on :8000
./scripts/stop.sh    # stops and removes pm-app container
```

### Backend development (without Docker)
Run all commands from the **project root**:
```bash
pip install -e backend/
uvicorn backend.main:app --reload --port 8000
```

### Backend tests
Run from the **project root** (so the `backend` package is importable):
```bash
python -m unittest discover -s backend/tests -v
# or a single test:
python -m unittest backend.tests.test_backend.BackendPersistenceTests.test_health_endpoint
```

### Frontend development
```bash
cd frontend
npm install
npm run dev          # starts Next.js dev server on :3000
```

Set `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api` in `frontend/.env.local` when running frontend dev server against a local backend.

### Frontend lint and tests
```bash
cd frontend
npm run lint         # ESLint
npm test             # unit tests via vitest
npm run test:e2e     # Playwright e2e (builds Docker image first)
```

## Architecture

```
/ (project root)
  .env                   OPENROUTER_API_KEY and OPENROUTER_MODEL
  Dockerfile             multi-stage: builds Next.js then installs Python backend
  scripts/               start/stop scripts for Mac, Windows, Linux
  data/pm.db             SQLite database (Docker mounts this for persistence)

backend/
  main.py                FastAPI app, Pydantic models, all API routes
  db.py                  SQLite access — stores the full board as one JSON blob per user
  ai.py                  OpenRouter calls with model fallback list
  tests/test_backend.py  unittest + FastAPI TestClient

frontend/src/
  app/page.tsx           root page: login gate, passes username to KanbanBoard
  components/            KanbanBoard, KanbanColumn, KanbanCard, KanbanCardPreview, LoginScreen, NewCardForm
  lib/kanban.ts          BoardData types, moveCard logic, createId (pure functions)
  lib/api.ts             fetch wrappers for /api/board and /api/chat
```

### Key data flow

- Board state lives in the frontend (`KanbanBoard`) and is synced to `POST /api/board/{username}` on every change.
- The AI chat (`POST /api/chat`) receives the full board JSON plus conversation history and returns `{ message, boardUpdate }`. If `boardUpdate` is non-null and valid, the frontend replaces its board state with it.
- `BoardModel` in `main.py` validates that every `cardId` referenced by a column actually exists in `cards` — invalid AI responses are silently dropped.
- `ai.py` tries each model in `OPENROUTER_MODEL` (or the default list) in sequence, falling back on any error.

### Frontend patterns

- Drag-and-drop uses `@dnd-kit/core` with `closestCorners` collision detection. `KanbanCardPreview` renders inside `DragOverlay`.
- `updateBoard(updater, { debounce })` in `KanbanBoard` is the single mutation path: it runs the updater, syncs to the backend, and optionally debounces (400 ms) for high-frequency changes like column renames.
- Styling uses Tailwind with CSS variables (`--navy-dark`, `--primary-blue`, `--secondary-purple`, `--stroke`, `--surface`, `--shadow`, `--gray-text`) defined in the global stylesheet — use these instead of hard-coding hex values.

### Static serving

The backend serves the Next.js static export (`next build` produces `frontend/out/`). In development, `main.py` falls back to `backend/static/` if `frontend/out/` doesn't exist. In Docker, the Dockerfile copies `frontend/out` into `backend/static`.

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `OPENROUTER_API_KEY` | Yes | Must start with `sk-or-` |
| `OPENROUTER_MODEL` | No | Comma-separated model list; defaults to free Gemma models |
| `PM_DB_PATH` | No | SQLite path; defaults to `backend/pm.db`; Docker sets to `/app/data/pm.db` |

## Coding standards

- No over-engineering, no unnecessary defensive programming, no extra features.
- No emojis anywhere.
- Identify root cause before fixing — prove with evidence, don't guess.
- Use latest idiomatic library approaches.
- Keep comments minimal: only when the why is non-obvious.

## Color scheme

- Accent yellow: `#ecad0a`
- Blue primary: `#209dd7`
- Purple secondary: `#753991`
- Dark navy: `#032147`
- Gray text: `#888888`
