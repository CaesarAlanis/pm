# Project implementation plan

## Part 1: Planning and project context

### Objective

Finish the planning work for the MVP so that implementation can proceed safely and predictably.

### Checklist

- [x] Expand this plan into a detailed milestone-based checklist.
- [x] Create a frontend agent guide in the frontend directory that explains the existing structure and conventions.
- [x] Keep the plan aligned with the project requirements in the root AGENTS file.
- [ ] Review the updated plan with the user and obtain approval before implementation starts.

### Tests and verification

- Confirm that the plan covers all major milestones from scaffolding through AI integration.
- Confirm that the frontend guide reflects the current codebase structure and testing setup.

### Success criteria

- The plan is detailed enough for the agent to execute work incrementally without guessing.
- The frontend guide is accurate for the current codebase and can be used as a reference during implementation.

---

## Part 2: Scaffolding

### Objective

Create the local development foundation for the app, including Docker support, a FastAPI backend, and startup scripts.

### Checklist

- [ ] Create the Dockerfile and any required docker-compose or docker-related configuration.
- [ ] Create the backend package structure under backend/ with FastAPI app entry points.
- [ ] Add a minimal health endpoint and a simple example route that returns a basic response.
- [ ] Add start and stop scripts in scripts/ for Windows, macOS, and Linux.
- [ ] Verify that the app can start locally and serve a simple hello-world response.
- [ ] Verify that the backend can respond to a simple API request.

### Tests and verification

- Run the app locally and confirm the root page responds.
- Call the API endpoint and confirm it returns the expected payload.
- Confirm the startup and shutdown scripts work in the intended environment.

### Success criteria

- The project can be started locally with a single command.
- A simple static or text response is served successfully.
- The backend is reachable over HTTP and responds to a basic API call.

---

## Part 3: Frontend integration

### Objective

Serve the existing Next.js frontend from the application stack so the Kanban board is shown at the root route.

### Checklist

- [ ] Ensure the Next.js frontend can be built and served by the app stack.
- [ ] Configure the backend to serve the built frontend assets at /.
- [ ] Verify that the demo Kanban board is visible when visiting the app root.
- [ ] Add or update unit tests for the main board rendering logic.
- [ ] Add or update integration tests for the homepage experience.

### Tests and verification

- Run frontend unit tests.
- Run frontend integration tests.
- Open the app locally and confirm the board renders.

### Success criteria

- The frontend is served from the application entry point.
- The Kanban board appears at /.
- The relevant tests pass and protect the expected UI behavior.

---

## Part 4: Fake sign-in experience

### Objective

Add a simple authentication gate so the app requires a dummy login before showing the board.

### Checklist

- [ ] Add a sign-in screen that accepts the dummy credentials user and password.
- [ ] Require authentication before the Kanban board is shown.
- [ ] Add a logout flow that returns the user to the sign-in experience.
- [ ] Preserve the existing board experience after authentication.
- [ ] Add tests for successful login, failed login, and logout behavior.

### Tests and verification

- Verify that unauthenticated users cannot view the board.
- Verify that valid credentials allow access.
- Verify that logout returns the user to the sign-in screen.

### Success criteria

- The sign-in experience is functional and simple.
- The board is hidden until authentication succeeds.
- Tests cover the main authentication flows.

---

## Part 5: Database modeling

### Objective

Define the data model for the Kanban board and document the storage approach before backend implementation.

### Checklist

- [x] Define a minimal schema for users, boards, columns, and cards.
- [x] Save the schema as JSON in the docs directory.
- [x] Document the database approach, including why SQLite is appropriate for the MVP.
- [ ] Present the proposed schema to the user and obtain approval before backend persistence work begins.

### Tests and verification

- Validate that the proposed schema can represent the required board structure.
- Confirm the schema supports future multi-user growth without over-engineering the MVP.

### Success criteria

- The schema is documented clearly and is suitable for the current MVP scope.
- The user has reviewed and approved the persistence approach.

---

## Part 6: Backend persistence

### Objective

Add backend routes that can read and modify Kanban data for a signed-in user.

### Checklist

- [ ] Create the database file automatically if it does not exist.
- [ ] Implement data access functions for users, boards, columns, and cards.
- [ ] Add API routes to fetch the board state and update board contents.
- [ ] Ensure the backend handles the MVP single-board-per-user case cleanly.
- [ ] Add backend unit tests for create, read, update, and delete operations.

### Tests and verification

- Verify that the API returns the initial board shape for a valid user.
- Verify that board updates persist after repeated requests.
- Verify that the database file is created automatically on first use.

### Success criteria

- The backend can persist and retrieve board state reliably.
- Unit tests cover the primary data operations.
- The database setup is robust for local development.

---

## Part 7: Frontend and backend integration

### Objective

Connect the frontend to the backend so the board becomes persistent instead of being purely local state.

### Checklist

- [ ] Replace local-only board state with API-backed loading and saving.
- [ ] Handle loading states and error states in the UI.
- [ ] Ensure drag-and-drop actions save to the backend.
- [ ] Ensure card creation, renaming, and deletion flow through the backend.
- [ ] Add thorough frontend and API integration tests.

### Tests and verification

- Verify that the UI loads board data from the backend.
- Verify that changes are persisted and reflected after refresh.
- Verify that errors during save operations are surfaced clearly.

### Success criteria

- The board is fully persistent for a signed-in user.
- The UI behaves correctly when the backend is available and when it is not.
- Integration coverage is strong enough to catch regressions.

---

## Part 8: AI connectivity

### Objective

Enable the backend to connect to OpenRouter and verify that AI requests can succeed.

### Checklist

- [ ] Add the OpenRouter client configuration using the existing environment variable.
- [ ] Add a simple connectivity test endpoint or internal test path.
- [ ] Verify the backend can make a basic request such as a simple arithmetic prompt.
- [ ] Confirm the API key and model configuration are wired correctly.

### Tests and verification

- Run a simple AI request and confirm that a valid response is returned.
- Capture and inspect any configuration issues before proceeding.

### Success criteria

- The backend can call the AI provider successfully.
- The basic connectivity test passes reliably.

---

## Part 9: Structured AI board actions

### Objective

Allow the AI to work with the Kanban board data in a structured way.

### Checklist

- [ ] Send the current board JSON, the user question, and relevant conversation history to the AI.
- [ ] Require the AI response to follow a structured output format.
- [ ] Support a response that includes both a conversational answer and an optional Kanban update.
- [ ] Apply valid board updates safely and only when the payload is well-formed.
- [ ] Add backend tests for both successful and invalid AI responses.

### Tests and verification

- Verify that a valid AI update changes the board as expected.
- Verify that malformed AI output is handled safely.
- Verify that the conversational response is preserved even when no board change is requested.

### Success criteria

- The AI can interpret board context and respond in a structured format.
- The app can safely apply AI-driven board changes.
- Tests cover both success and failure cases.

---

## Part 10: AI sidebar experience

### Objective

Add a polished AI chat sidebar to the UI so the user can interact with the board naturally.

### Checklist

- [ ] Add a sidebar widget for chat input and message history.
- [ ] Send user messages to the backend and display the AI response in the UI.
- [ ] Apply AI-driven board updates automatically when the structured response includes them.
- [ ] Refresh the board view immediately after a successful update.
- [ ] Add UI tests for the chat experience and state refresh behavior.

### Tests and verification

- Verify that the sidebar renders correctly.
- Verify that user messages send and receive responses.
- Verify that board updates appear immediately after AI-driven changes.

### Success criteria

- The AI experience feels integrated into the Kanban workflow.
- The board refreshes correctly after AI changes.
- The new UI is covered by tests and is stable for the MVP.
