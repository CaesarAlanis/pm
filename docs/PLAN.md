# High level steps for project

This plan breaks down each part into a checklist with tests and success criteria.

## Part 1: Plan

Checklist
- [x] Expand this plan with detailed checklists, tests, and success criteria.
- [x] Create `frontend/AGENTS.md` documenting the current demo frontend.
- [x] Share the updated plan for user approval before proceeding to Part 2.

Tests
- None (documentation only).

Success criteria
- `docs/PLAN.md` lists detailed steps, tests, and criteria for Parts 2-10.
- `frontend/AGENTS.md` describes the existing demo app structure and tooling.
- User explicitly approves the plan.

## Part 2: Scaffolding

Checklist
- [x] Add Docker infrastructure for a single container.
- [x] Create `backend/` FastAPI app (serves static HTML at `/` and a sample API).
- [x] Add start/stop scripts for Mac/PC/Linux in `scripts/`.
- [x] Ensure local run works via scripts and Docker.

Tests
- [x] Manual: run start script and confirm `/` returns static HTML.
- [x] Manual: call a sample API endpoint and verify JSON response.

Success criteria
- Docker builds and runs locally.
- FastAPI serves a hello-world HTML page at `/` and a working JSON API route.
- Start/stop scripts work on supported platforms.

## Part 3: Add in Frontend

Checklist
- [x] Build the Next.js frontend for static serving.
- [x] Serve the built frontend from FastAPI at `/`.
- [x] Confirm the Kanban demo renders at `/`.
- [x] Add/extend unit and integration tests.

Tests
- [x] `npm run test:unit` in `frontend/`.
- [x] `npm run test:e2e` (Playwright) against the Docker-served app.

Success criteria
- `/` shows the existing Kanban demo UI.
- Unit tests and Playwright tests pass.

## Part 4: Fake user sign-in

Checklist
- [x] Add a login screen before the board is visible.
- [x] Validate credentials: `user` / `password`.
- [x] Support logout to return to the login screen.
- [x] Add/extend tests to cover login/logout.

Tests
- [x] Unit tests for auth state logic.
- [x] Playwright flow: login → view board → logout.

Success criteria
- Unauthenticated users see the login form.
- Valid credentials grant access to the board.
- Logout returns to login state.
- Tests pass.

## Part 5: Database modeling

Checklist
- [x] Propose a SQLite schema for board, columns, cards, users.
- [x] Save the schema as JSON Schema in `docs/`.
- [x] Document data model decisions in `docs/`.
- [ ] Request user sign-off.

Tests
- [ ] None (documentation only).

Success criteria
- JSON Schema file exists in `docs/` describing entities and relations.
- Documentation explains assumptions and constraints.
- User approves the schema.

## Part 6: Backend

Checklist
- [x] Implement database setup (create if missing).
- [x] Add CRUD API routes for board/columns/cards.
- [x] Scope data by user.
- [x] Add backend unit tests for API and data layer.

Tests
- [x] Backend unit tests (pytest).

Success criteria
- API supports reading and modifying the board for a user.
- Database auto-creates on first run.
- Backend tests pass.

## Part 7: Frontend + Backend

Checklist
- [x] Replace frontend local state with API calls.
- [x] Keep UI updates consistent with backend data.
- [x] Add integration tests for end-to-end persistence.

Tests
- [x] Playwright: add/move/edit cards and verify persistence.
- [x] Backend unit tests remain green.

Success criteria
- Board changes persist across refreshes.
- UI matches backend state.
- Tests pass.

## Part 8: AI connectivity

Checklist
- [x] Add OpenRouter client with `openai/gpt-oss-120b`.
- [x] Add backend route to test AI connectivity.
- [x] Load `OPENROUTER_API_KEY` from `.env`.

Tests
- [x] Backend test hitting AI endpoint with "2+2" and verifying response.

Success criteria
- AI connectivity route returns a valid response.
- API key is wired in via environment variables.

## Part 9: AI structured outputs + Kanban updates

Checklist
- [ ] Send board JSON + conversation history + user prompt to AI.
- [ ] Define Structured Output schema for AI responses.
- [ ] Apply optional board updates from AI responses.
- [ ] Add unit tests for schema validation and update application.

Tests
- [ ] Backend tests verifying schema compliance and update behavior.

Success criteria
- AI responses validate against the schema.
- Board updates apply deterministically.
- Tests pass.

## Part 10: AI sidebar UI

Checklist
- [ ] Add sidebar chat UI to the frontend.
- [ ] Stream or display AI responses in the chat.
- [ ] Apply AI-driven board updates in the UI.
- [ ] Add UI tests for chat and board sync.

Tests
- [ ] Playwright flow: chat → AI response → optional board update.

Success criteria
- Sidebar chat works and is visually integrated.
- Board updates refresh automatically after AI updates.
- Tests pass.