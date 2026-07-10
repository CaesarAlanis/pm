# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

A Kanban-based project management MVP with an AI assistant sidebar. The stack is:

- **Frontend**: Next.js 16 (static export via `output: "export"`) with React 19, dnd-kit for drag-and-drop, Tailwind CSS
- **Backend**: FastAPI + Uvicorn, Python 3.11+, SQLite persistence via `pm.sqlite` at the repo root
- **AI**: OpenRouter (configured via `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` env vars)

The backend serves the pre-built Next.js static export from `frontend/out/` at `/`, and all API routes are under `/api/`.

## Development commands

### Start the app (Windows)

```powershell
.\scripts\start.ps1
```

This installs Python deps with `uv`, builds the Next.js frontend (`npm run build`), then starts Uvicorn at `http://127.0.0.1:8000`.

### Start the app (macOS/Linux)

```bash
./scripts/start.sh
```

### Docker

```bash
docker compose up --build
```

### Frontend development only

```bash
cd frontend
npm install
npm run dev      # dev server at http://localhost:3000
npm run build    # static export to frontend/out/
```

### Backend development only

```powershell
# From repo root, with .venv active:
$env:PYTHONPATH = "."
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

## Testing

### Frontend unit tests (Vitest)

```bash
cd frontend
npx vitest run              # run all
npx vitest run --reporter=verbose
npx vitest run src/components/KanbanBoard.test.tsx  # single file
```

### Frontend E2E tests (Playwright)

```bash
cd frontend
npx playwright test
```

### Backend tests (pytest)

```bash
# From repo root, with .venv active and PYTHONPATH=.
$env:PYTHONPATH = "."
.\.venv\Scripts\python.exe -m pytest backend/tests/
.\.venv\Scripts\python.exe -m pytest backend/tests/test_persistence.py  # single file
```

Dev dependencies for the backend are in `backend/requirements-dev.txt` (`pytest`, `httpx`).

## Architecture

### Authentication

`AuthGate` (`frontend/src/components/AuthGate.tsx`) wraps the entire app. It shows a login form before rendering `KanbanBoard`. The dummy credentials are `user` / `password`. On login the username is passed down to `KanbanBoard` and used in all `/api/board/{username}` calls.

### Board data flow

1. `KanbanBoard` loads board state from `GET /api/board/{username}` on mount.
2. All mutations (drag-and-drop, card create/rename/delete) call `PUT /api/board/{username}` with the full updated board payload.
3. The AI sidebar (`AIAssistantSidebar`) posts user messages to `POST /api/ai/board-action`. When the AI response includes a `board_update`, the backend applies it and returns the new board state, which the frontend uses to refresh the UI.

### Board payload shape

```json
{
  "columns": [{ "id": "col-1", "title": "Backlog", "cardIds": ["card-1"] }],
  "cards": { "card-1": { "id": "card-1", "title": "...", "details": "..." } }
}
```

### Database

`backend/database.py` manages a single SQLite file (`pm.sqlite`) at the repo root. `ensure_seed_data()` is called on every read/write — it bootstraps the schema and seeds the demo user (`user`) plus a default board on first run. `replace_board_state` does a delete-and-reinsert of all columns and cards for a given user's board.

### Backend API routes

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/health` | Health check |
| GET | `/api/board/{username}` | Fetch board state |
| PUT | `/api/board/{username}` | Replace full board state |
| GET | `/api/ai/connectivity` | Test OpenRouter connection |
| POST | `/api/ai/board-action` | AI chat + optional board update |

### Frontend shared logic

`frontend/src/lib/kanban.ts` holds `BoardData` types, `initialData` (fallback when API is unavailable), `moveCard` helper, and `createId`.

## Implementation milestones (from `docs/PLAN.md`)

Parts 1–5 (planning, scaffolding, frontend integration, auth, DB schema) are complete. Parts 6–10 (backend persistence, full integration, AI connectivity, structured AI actions, AI sidebar) are in progress or planned — check `docs/PLAN.md` for the current checklist state.
