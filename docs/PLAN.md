# High level steps for project

## Part 1: Plan

Enrich this document to plan out each of these parts in detail, with substeps listed out as a checklist to be checked off by the agent, and with tests and success criteria for each. Also create an AGENTS.md file inside the frontend directory that describes the existing code there. Ensure the user checks and approves the plan.

- [ ] Create frontend/AGENTS.md with high-level architecture summary
- [ ] Enrich PLAN.md with detailed substeps for all 10 parts
- [ ] Get user sign-off on the enriched plan

**Tests:** AGENTS.md exists and accurately describes the frontend. PLAN.md has checklists for all parts.

**Success criteria:** User approves the enriched PLAN.md.

---

## Part 2: Scaffolding

Set up the Docker infrastructure, the backend in backend/ with FastAPI, and write the start and stop scripts in the scripts/ directory. This should serve example static HTML to confirm that a 'hello world' example works running locally and also make an API call.

- [x] Create Dockerfile in project root (Python base, install uv, copy backend, expose port)
- [x] Create docker-compose.yml (single service, mount .env, map port)
- [x] Create backend/ with FastAPI app structure:
  - [x] backend/main.py with FastAPI app, health check route, and static file serving stub
  - [x] backend/pyproject.toml with dependencies (fastapi, uvicorn)
  - [x] backend/app/routes.py with a sample API route (e.g. GET /api/hello returning JSON)
- [x] Create a sample static HTML file that the backend serves at / and that calls /api/hello
- [x] Create scripts/start.sh, scripts/start.bat, scripts/start.ps1
- [x] Create scripts/stop.sh, scripts/stop.bat, scripts/stop.ps1
- [x] Create .dockerignore
- [x] Update backend/AGENTS.md with description of the backend
- [x] Update scripts/AGENTS.md with description of the scripts
- [x] Test: backend unit tests pass (3/3, 100% coverage)
- [x] Test: visiting / shows the static HTML page (verified via local uvicorn)
- [x] Test: /api/hello returns expected JSON (verified via local uvicorn)
- [x] Test: `docker compose up` starts successfully (verified — container healthy, all endpoints respond)

**Tests:**
- Backend unit test: GET /api/hello returns 200 with correct JSON
- Backend unit test: static file serving returns HTML at /
- Manual: docker compose up, curl / and /api/hello, docker compose down

**Success criteria:** Running `scripts/start.sh` (or platform equivalent) starts the container; visiting the URL shows static HTML with API response; `scripts/stop.sh` stops the container cleanly.

---

## Part 3: Add in Frontend

Now update so that the frontend is statically built and served, so that the app has the demo Kanban board displayed at /. Comprehensive unit and integration tests.

- [x] Update Dockerfile to include Node.js build stage for the frontend
- [x] Add multi-stage build: Node stage runs `npm ci && npm run build`, copies output to backend
- [x] Configure FastAPI to serve the Next.js static export from / (catch-all route for static files, fallback to index.html)
- [x] Verify the Kanban board renders at / (verified via local uvicorn, Docker needs manual test)
- [x] Ensure existing Vitest unit tests pass (14/14)
- [ ] Ensure existing Playwright e2e tests pass against the running container (needs Docker)
- [x] Add any missing unit tests to reach 80% coverage target (86.39%)

**Tests:**
- `npm run build` succeeds without errors
- All existing Vitest tests pass
- All existing Playwright tests pass against the served app
- Coverage report shows >= 80% for src/

**Success criteria:** Docker container serves the full Kanban board at / with drag-and-drop working. All tests pass. Coverage >= 80%.

---

## Part 4: Add in a fake user sign in experience

Now update so that on first hitting /, you need to log in with dummy credentials ("user", "password") in order to see the Kanban, and you can log out. Comprehensive tests.

- [x] Add login page component to frontend (username + password form)
- [x] Add session state management (logged in / not logged in) -- use React context or simple state
- [x] POST /api/auth/login endpoint in backend: accepts {username, password}, returns session token on match with "user"/"password"
- [x] POST /api/auth/logout endpoint in backend
- [x] GET /api/auth/me endpoint to check session status
- [x] Frontend redirects to login page if not authenticated
- [x] Logout button in the UI when logged in
- [x] Add route protection logic (redirect unauthenticated users)
- [x] Backend unit tests for auth endpoints (login success, login failure, logout, me)
- [x] Frontend unit tests for login form, redirect behavior, logout
- [ ] Playwright e2e test: login flow, logout flow, protected route redirect (needs Docker)

**Tests:**
- Backend unit: POST /api/auth/login with correct creds returns 200 + token
- Backend unit: POST /api/auth/login with wrong creds returns 401
- Backend unit: POST /api/auth/logout clears session
- Backend unit: GET /api/auth/me returns user info when authenticated
- Backend unit: GET /api/auth/me returns 401 when not authenticated
- Frontend unit: login form renders, submits, shows error on bad creds
- Frontend unit: unauthenticated user sees login page
- Frontend unit: logout clears session and redirects
- E2e: full login -> see board -> logout -> see login page

**Success criteria:** Unauthenticated users see login page. Logging in with "user"/"password" shows the Kanban. Logging out returns to login. All tests pass. Coverage >= 80%.

---

## Part 5: Database modeling

Now propose a database schema for the Kanban, saving it as JSON. Document the database approach in docs/ and get user sign off.

- [x] Design SQLite schema: users table, boards table, columns table, cards table
- [x] Write schema as SQL migration file in backend/
- [x] Write schema documentation in docs/DATABASE.md (tables, relationships, constraints)
- [x] Include seed data structure (initial columns for a new user)
- [ ] Get user sign-off on the schema

**Tests:**
- Schema documentation is clear and complete
- SQL is valid and can be executed against SQLite

**Success criteria:** User approves the database schema and docs/DATABASE.md. Schema supports multiple users (for future) and one board per user (MVP).

---

## Part 6: Backend

Now add API routes to allow the backend to read and change the Kanban for a given user; test this thoroughly with backend unit tests. The database should be created if it doesn't exist.

- [x] Add SQLAlchemy or raw sqlite3 integration to backend
- [x] Add database initialization logic (create tables if not exist, seed default board for new user)
- [x] GET /api/boards -- returns the authenticated user's board (columns + cards)
- [x] PUT /api/boards -- replaced with granular endpoints
- [x] POST /api/boards/cards -- add a card to a column
- [x] PUT /api/boards/cards/{id} -- update a card
- [x] DELETE /api/boards/cards/{id} -- delete a card
- [x] PUT /api/boards/columns/{id} -- rename a column
- [x] PUT /api/boards/cards/{id}/move -- reorder cards within/across columns
- [x] All routes require authentication
- [x] Database file is created automatically on first request if it doesn't exist
- [x] Backend unit tests for all CRUD endpoints (26 tests, 96% coverage)
- [x] Update backend/AGENTS.md

**Tests:**
- Unit: each endpoint returns correct status codes and data
- Unit: unauthenticated requests return 401
- Unit: database is auto-created on first request
- Unit: new user gets a default board with seed columns
- Unit: card CRUD operations work correctly
- Unit: column rename works
- Unit: card reorder within and across columns works
- Coverage >= 80%

**Success criteria:** All API routes work with authentication. Database auto-creates. Tests pass with >= 80% coverage.

---

## Part 7: Frontend + Backend

Now have the frontend actually use the backend API, so that the app is a proper persistent Kanban board. Test very thoroughly.

- [x] Replace frontend seed data with API fetch on mount
- [x] After login, fetch board from GET /api/boards and populate state
- [x] On drag-and-drop, call move API then update local state (optimistic + revert on error)
- [x] On add card, call POST /api/boards/cards then update local state
- [x] On delete card, call DELETE /api/boards/cards/{id} then update local state
- [x] On rename column, call PUT /api/boards/columns/{id} then update local state
- [x] Handle API errors gracefully (revert optimistic updates on failure)
- [x] Handle loading states
- [x] Board persists across page refreshes (data comes from DB)
- [x] Update Vitest tests to mock API calls (23 tests)
- [ ] Update Playwright e2e tests to test full flow with backend (needs Docker)
- [x] Ensure >= 80% test coverage (frontend 84%, backend 96%)

**Tests:**
- Unit: KanbanBoard fetches data from API on mount
- Unit: each action (add, delete, move, rename) calls the correct API endpoint
- Unit: error handling works when API calls fail
- E2e: full flow -- login, see persisted board, add card, refresh, card still there
- E2e: drag card, refresh, card stays in new position
- Coverage >= 80%

**Success criteria:** The Kanban board is fully persistent. All changes survive page refresh. All tests pass. Coverage >= 80%.

---

## Part 8: AI connectivity

Now allow the backend to make an AI call via OpenRouter. Test connectivity with a simple "2+2" test and ensure the AI call is working.

- [x] Add httpx dependency to backend for OpenRouter API calls
- [x] Create backend/app/ai.py with a function that calls OpenRouter API using the key from .env
- [x] Use model "glm-5.1" as specified in AGENTS.md
- [x] Add POST /api/ai/test endpoint that sends "2+2" to the AI and returns the response
- [x] Load OPENROUTER_API_KEY from environment variable
- [x] Backend unit test for AI module (mock the HTTP call, verify request format) -- 5 tests, 100% ai.py coverage
- [ ] Manual test: call /api/ai/test and confirm AI responds with "4" (needs OPENROUTER_API_KEY in .env)

**Tests:**
- Unit: AI module constructs correct request to OpenRouter (mocked HTTP)
- Unit: API endpoint returns 200 and AI response
- Unit: missing API key returns appropriate error
- Manual: /api/ai/test returns a valid AI response

**Success criteria:** Backend can successfully call OpenRouter API and return a response. Unit tests pass. Manual test confirms connectivity.

---

## Part 9: Structured AI Outputs

Now extend the backend call so that it always calls the AI with the JSON of the Kanban board, plus the user's question (and conversation history). The AI should respond with Structured Outputs that includes the response to the user and optionally an update to the Kanban. Test thoroughly.

- [x] Design the AI system prompt instructing it to analyze the Kanban board and respond with structured output
- [x] Define the structured output schema: { message: string, board_update: BoardData | null }
- [x] Create backend/app/ai.py function that:
  - [x] Accepts: board JSON, user message, conversation history
  - [x] Sends to OpenRouter with system prompt + structured output instruction
  - [x] Parses the AI response into the defined schema
  - [x] Returns parsed result
- [x] Add POST /api/ai/chat endpoint that:
  - [x] Requires authentication
  - [x] Loads user's current board from DB
  - [x] Calls the AI function with board + message + history
  - [x] If board_update is present, applies the update to the database
  - [x] Returns { message, board_updated: bool }
- [x] Store conversation history per user (in-memory, last 20 messages)
- [ ] Backend unit tests:
  - [x] AI function constructs correct prompt with board context
  - [x] AI response with board_update applies changes to DB
  - [x] AI response without board_update leaves board unchanged
  - [x] Conversation history is maintained across calls
  - [x] Invalid AI response is handled gracefully
- [x] Integration test: full flow from chat message to board update

**Tests:**
- Unit: AI module sends board JSON + user message + history in prompt
- Unit: structured output parsing works for valid responses
- Unit: board_update is applied to DB when present
- Unit: board is unchanged when board_update is null
- Unit: conversation history accumulates across calls
- Unit: malformed AI response is handled without crash
- Coverage >= 80%

**Success criteria:** AI receives full board context, returns structured output, and board updates are applied when the AI decides to modify the board. All tests pass.

---

## Part 10: AI Chat Sidebar

Now add a beautiful sidebar widget to the UI supporting full AI chat, and allowing the LLM (as it determines) to update the Kanban based on its Structured Outputs. If the AI updates the Kanban, then the UI should refresh automatically.

- [x] Add a chat sidebar component (collapsible, slides in from the right)
- [x] Chat UI: message list, input field, send button
- [x] Display user messages and AI responses with distinct styling
- [x] On send, call POST /api/ai/chat with the message
- [x] Show loading indicator while waiting for AI response
- [x] If response includes board_update, refresh the board state from the API
- [x] Show a visual indicator when the AI has updated the board
- [x] Conversation history persists during the session
- [x] Style the sidebar using the project color scheme (accent turquoise, dark teal, gray)
- [x] Frontend unit tests for sidebar component (8 tests)
- [ ] Playwright e2e test: chat with AI, see board update (needs Docker + API key)
- [x] Ensure >= 80% test coverage (frontend 87%, backend 96%)

**Tests:**
- Unit: sidebar renders correctly (open/closed states)
- Unit: sending a message calls the API
- Unit: AI response is displayed in the chat
- Unit: board refreshes when AI returns a board_update
- Unit: visual indicator appears on board update
- E2e: open sidebar, send message, see AI reply, see board update if applicable
- Coverage >= 80%

**Success criteria:** Users can chat with the AI in a polished sidebar. The AI can update the board, and the UI refreshes automatically when it does. All tests pass. Coverage >= 80%.
