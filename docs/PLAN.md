# Project plan for the MVP web app

This plan expands the original roadmap into concrete implementation steps, with acceptance criteria and tests for each part.

## Part 1: Plan

Goals
- Confirm the implementation approach before any feature work begins.
- Capture the current frontend architecture in `frontend/AGENTS.md`.
- Verify assumptions: single JSON blob storage, frontend passes full AI conversation context, and no backend yet.

Tasks
- Create `frontend/AGENTS.md` describing the existing frontend demo.
- Review the current plan with the user and get approval before implementing.
- Record the schema decision: board state is stored as one JSON blob in SQLite.
- Record the chat decision: frontend will send the complete conversation history with each AI request.

Success criteria
- User approves the plan.
- `frontend/AGENTS.md` exists and correctly describes the current frontend architecture.
- The plan is detailed enough to drive implementation without guessing.

## Part 2: Scaffolding

Goals
- Create the backend foundation and local dev infrastructure.
- Verify that Docker can build and serve a minimal app.

Tasks
- Create `backend/` with a FastAPI app.
- Add `Dockerfile` and `.dockerignore` at the project root.
- Use `uv` as the Python package manager inside Docker.
- Add `scripts/start.sh`, `scripts/stop.sh`, and/or platform-specific wrappers if needed.
- Implement a FastAPI route that serves static files from the built frontend at `/`.
- Implement a simple API route such as `/api/health` or `/api/hello` returning JSON.
- Confirm that the container starts and that a browser/curl request returns the expected static HTML or JSON.

Tests
- Docker image builds successfully.
- Container responds with HTTP 200 for `/` and `/api/health`.
- `scripts/start.*` and `scripts/stop.*` work locally.

Success criteria
- A local container can run the app and serve a static page.
- The backend can respond to a simple API request.

## Part 3: Add in Frontend

Goals
- Serve the existing Next.js Kanban demo as a statically built frontend from the backend.

Tasks
- Configure the Next.js app to build a production output that can be served by FastAPI.
- Update the Docker build pipeline to build the frontend first, then copy the static output into the backend image.
- Ensure `frontend/src/app/page.tsx` continues to render the Kanban board.
- Add any required build/test scripts in the repository README or scripts.

Tests
- `npm run build` succeeds in `frontend/`.
- The backend container serves the built Kanban app at `/`.
- Existing frontend unit tests and render tests pass.

Success criteria
- The demo app is served from the backend container as a static site.
- The Kanban board appears at `/` in production mode.

## Part 4: Add a fake user sign in experience

Goals
- Gate the app behind a simple dummy login before showing the board.

Tasks
- Add a login screen to the frontend requiring `user` / `password`.
- Add logout support and return the user to the login screen.
- Keep the login flow simple and local-state based at first.
- Ensure the board page is not accessible until the user is authenticated.

Tests
- Valid credentials allow access to the Kanban board.
- Invalid credentials show an error and do not allow access.
- Logout returns the user to the login screen.

Success criteria
- The app requires a dummy login before displaying the Kanban board.
- The credentials are exactly `user` / `password`.

## Part 5: Database modeling

Goals
- Define the SQLite schema for storing user boards and app data.
- Keep the Kanban board structure as a single JSON blob.

Tasks
- Create a documentation page in `docs/` describing the database schema.
- Define at least these entities:
  - `users` table with minimal identity fields.
  - `boards` table with a JSON column for the Kanban board.
  - Optionally `conversations` table if the AI history is stored later.
- Capture the schema in a plain, user-readable form.

Tests
- The docs clearly state that board state is stored as one JSON blob per user.
- The schema is reviewed and approved by the user.

Success criteria
- A documented SQLite schema exists in `docs/`.
- The schema matches the product decisions and is ready for backend implementation.

## Part 6: Backend

Goals
- Build the API surface for reading and writing a user's Kanban board.
- Ensure the database is created automatically if missing.

Tasks
- Add backend routes such as:
  - `GET /api/board` or `GET /api/board/{user}`
  - `POST /api/board` or `POST /api/board/{user}`
  - Optionally `POST /api/login` if auth is moved backend-side later.
- Use SQLite and create the DB file on startup if it does not exist.
- Store the board as a single JSON blob in the database.
- Add backend unit tests for database creation, read, and write.

Tests
- New backend API routes return the expected JSON.
- The SQLite file is created automatically when the backend starts.
- Unit tests cover read/write operations.

Success criteria
- The backend can persist and return a Kanban board for a user.
- DB initialization works automatically.

## Part 7: Frontend + Backend

Goals
- Switch the frontend from local state to real backend persistence.

Tasks
- On login, fetch the user's board from the backend.
- Send updates to the backend when cards move, columns rename, cards are added, or cards are removed.
- Keep local UI state synchronized with backend responses.
- Preserve the single-board-per-user model.

Tests
- Full app flow works end-to-end in the browser.
- Reloading the page shows persisted board state.
- Frontend/backend integration tests confirm API usage.

Success criteria
- The Kanban board state is persisted across refreshes.
- The app uses the backend API instead of only local React state.

## Part 8: AI connectivity

Goals
- Add backend support for OpenRouter AI calls.

Tasks
- Add a backend AI route such as `POST /api/ai` or `POST /api/chat`.
- Use `OPENROUTER_API_KEY` from the project root `.env`.
- Implement a minimal OpenRouter request for simple test prompts.
- Confirm AI connectivity with a simple question like `2+2`.

Tests
- Backend AI route returns a valid response from OpenRouter.
- A 2+2 test verifies the model is reachable.

Success criteria
- The backend can call OpenRouter successfully.
- AI connectivity is proven with a simple test prompt.

## Part 9: Structured AI updates

Goals
- Ensure AI requests include the current board JSON and conversation history.
- Allow the AI to return structured updates that may modify the board.

Tasks
- Send the serialized board state and conversation history with each AI request.
- Define a structured response format with fields such as `message` and `boardUpdate`.
- Parse the AI output safely and apply updates only when valid.
- Return both the AI text response and any updated board JSON to the frontend.

Tests
- Backend can process a structured AI response containing board updates.
- The AI response format is validated before applying changes.

Success criteria
- AI responses can include an optional board update payload.
- The API returns both chat text and structured update information.

## Part 10: AI sidebar and chat UX

Goals
- Add a polished AI chat sidebar in the UI.
- Let the AI optionally update the board and refresh the UI automatically.

Tasks
- Add a sidebar chat panel to the frontend layout.
- Send user messages and full conversation history to the AI route.
- Display AI responses in the sidebar.
- If the AI returns board updates, merge them into the current board state.
- Keep the chat and board synchronized.

Tests
- The AI sidebar shows conversation history and responses.
- Board updates from the AI are applied automatically.
- The UI remains stable when chat or board updates occur.

Success criteria
- Users can chat with the AI from the app.
- AI-driven board updates appear in the Kanban automatically.
- The UI remains responsive and coherent.
