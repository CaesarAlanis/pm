# Project Implementation Plan

## Part 1: Plan & Documentation

- [x] Review AGENTS.md and docs/PLAN.md requirements.
- [x] Create AGENTS.md inside frontend/ describing Next.js components, state, design tokens, and tests.
- [x] Enrich docs/PLAN.md with step-by-step checklists, testing plans, and success criteria.
- [x] Obtain user approval on the enriched plan.

### Success Criteria & Verification
- `frontend/AGENTS.md` exists and accurately describes the frontend application.
- `docs/PLAN.md` is detailed with clear sub-steps and verification criteria.

---

## Part 2: Scaffolding (Backend, Docker & Control Scripts)

- [x] Create FastAPI backend application in `backend/` with `main.py`.
- [x] Configure `uv` Python project structure (`pyproject.toml`, `uv.lock`) in `backend/`.
- [x] Implement a static 'Hello World' HTML endpoint at `/` and a health API endpoint at `/api/health`.
- [x] Write `Dockerfile` and `docker-compose.yml` in root packaging Python FastAPI and serving static files.
- [x] Write cross-platform control scripts in `scripts/`:
  - `scripts/start.sh` & `scripts/start.bat` (Starts Docker container environment).
  - `scripts/stop.sh` & `scripts/stop.bat` (Stops Docker container environment).
- [x] Write `backend/AGENTS.md` documenting the FastAPI backend setup and scripts usage.

### Success Criteria & Verification
- Running `scripts/start` boots the containerized FastAPI server locally.
- Accessing `http://localhost:8000` returns the static 'Hello World' HTML.
- Accessing `http://localhost:8000/api/health` returns `{"status": "ok"}`.
- Running `scripts/stop` stops the container gracefully.

---

## Part 3: Add & Serve Static Frontend Build

- [x] Update `frontend/next.config.ts` for static HTML export (`output: 'export'`).
- [x] Update build setup so `npm run build` generates static export output in `frontend/out`.
- [x] Update FastAPI backend to mount and serve `frontend/out` static files at `/`.
- [x] Verify static Next.js Kanban board loads correctly when served from FastAPI.
- [x] Run frontend unit and E2E tests.

### Success Criteria & Verification
- `npm run build` succeeds inside `frontend/`.
- Visiting `/` on the FastAPI server renders the Next.js Kanban board UI.
- All frontend tests pass (`npm run test:all`).

---

## Part 4: Fake User Sign-in Experience

- [x] Create sign-in page / modal component requiring credentials (`user` / `password`).
- [x] Implement auth state management (Session / Token in cookie or localStorage).
- [x] Add auth endpoint `/api/login` and `/api/logout` on FastAPI backend.
- [x] Protect Kanban UI so unauthenticated users see the sign-in form.
- [x] Add Logout button to the header to clear session and return to sign-in.
- [x] Write tests for login and logout flows.

### Success Criteria & Verification
- Accessing `/` while unauthenticated shows the login page.
- Entering incorrect credentials shows an error message.
- Entering `user` and `password` logs the user in and reveals the Kanban board.
- Clicking Logout clears session and returns to login screen.

---

## Part 5: Database Modeling

- [x] Propose SQLite database schema supporting multi-user structure (Users, Boards, Columns, Cards).
- [x] Document database schema and JSON representation in `docs/DATABASE.md`.
- [x] Create SQLite initialization module in `backend/` creating tables automatically if the DB file does not exist.

### Success Criteria & Verification
- SQLite database initializes automatically on startup if missing.
- Schema documentation `docs/DATABASE.md` is complete and verified.

---

## Part 6: Backend Kanban API Routes

- [x] Create FastAPI REST routes for Kanban operations:
  - `GET /api/board`: Returns current user's Kanban board.
  - `PUT /api/board`: Updates complete board state.
  - `POST /api/cards`: Creates a new card in a column.
  - `PUT /api/cards/{card_id}`: Updates card title/details or moves column.
  - `DELETE /api/cards/{card_id}`: Deletes a card.
  - `PUT /api/columns/{column_id}`: Renames a column.
- [x] Write Python unit tests using `pytest` and `httpx` to verify all API endpoints and database persistence.

### Success Criteria & Verification
- All CRUD API routes return correct HTTP status codes and JSON payloads.
- `pytest` passes with 100% test coverage on API endpoints.

---

## Part 7: Frontend + Backend Integration

- [x] Refactor frontend state in `KanbanBoard.tsx` to fetch board data from `/api/board` on load.
- [x] Update column rename, card move, card addition, and card deletion to sync changes to backend API.
- [x] Handle loading and error states in UI gracefully.
- [x] Run full E2E test suite verifying board modifications persist across browser page reloads.

### Success Criteria & Verification
- Board state persists after browser refresh.
- Drag-and-drop actions update backend database via API.
- All Playwright E2E tests pass cleanly.

---

## Part 8: AI Connectivity

> Note: Uses Google AI Studio via `google-genai` SDK and `gemini-2.5-flash` using `GEMINI_API_KEY` from `.env.local` (prioritized per AGENTS.md and .env.local).

- [x] Add Google GenAI SDK dependency (`google-genai`) to `backend/`.
- [x] Read `GEMINI_API_KEY` from `.env.local` or environment variables.
- [x] Implement backend AI service wrapper using `gemini-2.5-flash`.
- [x] Create test API endpoint `/api/ai/test` verifying simple prompt execution (e.g. "2+2").
- [x] Write automated backend test verifying AI connectivity.

### Success Criteria & Verification
- `/api/ai/test` returns successful response from `gemini-2.5-flash`.
- Automated test validates API key loading and call completion.

---

## Part 9: AI Reasoning & Structured Outputs

- [x] Define Pydantic response schema for Gemini Structured Output:
  - `explanation`: Message text to display to user.
  - `board_action`: Optional structured action (e.g., `CREATE_CARD`, `MOVE_CARD`, `EDIT_CARD`, `DELETE_CARD`, `RENAME_COLUMN`) with action payload.
- [x] Create `/api/ai/chat` POST endpoint accepting user prompt, chat history, and current board state JSON.
- [x] Formulate system prompt instructing AI on Kanban assistant behavior and structured output constraints.
- [x] Write unit tests verifying AI returns valid structured actions for commands like "Add a card titled 'Task A' to Backlog".

### Success Criteria & Verification
- AI endpoint receives board state + user message and returns structured output.
- Backend applies requested board modifications to SQLite database when `board_action` is returned.

---

## Part 10: AI Chat Sidebar UI & Real-Time Updates

- [x] Create AI Chat sidebar component in Next.js following project color palette (`#032147`, `#753991`, `#209dd7`, `#ecad0a`, `#888888`).
- [x] Implement chat message history list and user message input box.
- [x] Connect chat input to `/api/ai/chat` backend endpoint.
- [x] Auto-refresh Kanban board state when AI performs card/column modifications.
- [x] Add loading indicators and micro-interactions during AI processing.
- [x] Perform comprehensive end-to-end testing of AI chat interaction.

### Success Criteria & Verification
- AI sidebar renders cleanly alongside the Kanban board.
- User can chat with AI assistant.
- Telling the AI "Mueve la tarjeta 'Task A' a In Progress" updates the board UI automatically without manual drag-and-drop.
- All automated tests (`npm run test:all` and `pytest`) pass cleanly.