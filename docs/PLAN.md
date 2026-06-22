# Project Plan Index

This index tracks the detailed plan documents for each project part.

## Confirmed Constraints

- Runtime architecture: Next.js runtime server behind FastAPI proxy.
- Deployment target: single Docker container with frontend, backend, and SQLite.
- Auth approach: token-based login (MVP credentials: user / password).
- Data model approach: normalized SQLite tables with JSON snapshot support.
- AI model route: OpenRouter using openai/gpt-oss-120b.
- AI chat history persistence: in-memory per active app session only.
- Test stack: backend pytest; frontend vitest + playwright.
- Expected run command: docker compose up.
- Script naming: consistent cross-platform naming under scripts/.

## Part Documents

- [ ] [Part 1 - Planning and Documentation](./part-01-planning-and-documentation.md)
- [ ] [Part 2 - Scaffolding and Container Baseline](./part-02-scaffolding-and-container-baseline.md)
- [x] [Part 3 - Integrate Frontend Runtime](./part-03-integrate-frontend-runtime.md)
- [ ] [Part 4 - Token-Based Sign-In MVP](./part-04-token-based-sign-in-mvp.md)
- [ ] [Part 5 - Database Modeling and Snapshot Strategy](./part-05-database-modeling-and-snapshot-strategy.md)
- [ ] [Part 6 - Backend API for Kanban Persistence](./part-06-backend-api-for-kanban-persistence.md)
- [ ] [Part 7 - Frontend/Backend Integration](./part-07-frontend-backend-integration.md)
- [ ] [Part 8 - OpenRouter Connectivity](./part-08-openrouter-connectivity.md)
- [ ] [Part 9 - Structured AI Board Operations](./part-09-structured-ai-board-operations.md)
- [ ] [Part 10 - AI Sidebar UX and Live Board Updates](./part-10-ai-sidebar-ux-and-live-updates.md)

## Approval Gate

User review and approval is required after Part 1 planning docs are complete and before implementation begins.