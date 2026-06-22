# Part 2 - Scaffolding and Container Baseline

## Objective

Set up the Dockerized baseline with FastAPI backend, runtime Next.js process behind FastAPI proxy, and cross-platform start/stop scripts.

## Checklist

- [x] Add backend FastAPI project scaffold in `backend/` using `uv` for dependency management.
- [x] Add a minimal FastAPI app with:
  - [x] Health endpoint (for example `/api/health`).
  - [x] Placeholder API endpoint returning simple JSON.
  - [x] Proxy route wiring strategy for forwarding UI routes to Next.js runtime process.
- [x] Add Dockerfile (single-container design) and `docker-compose.yml`.
- [x] Ensure container includes all runtime dependencies for FastAPI, Next.js, and SQLite.
- [x] Add scripts in `scripts/` with a consistent naming scheme:
  - [x] `start.ps1`, `start.sh`
  - [x] `stop.ps1`, `stop.sh`
  - [x] Optional wrappers if needed for convenience only.
- [x] Ensure `docker compose up` is the primary local run path.

## Tests

- [x] `docker compose build` completes successfully.
- [x] `docker compose up` starts services without manual steps.
- [x] Browser request to `/api/health` returns success payload.
- [x] Browser request to `/` reaches placeholder UI path through FastAPI proxy to Next.js runtime.
- [x] Start/stop scripts run successfully on Windows.
- [x] Start/stop scripts run successfully on POSIX shell.

## Success Criteria

- Single container starts via `docker compose up` and serves both API and UI routing.
- Runtime architecture matches requirement: Next.js server behind FastAPI/proxy.
- Scripts are cross-platform and consistent.

## Risks and Notes

- Process supervision inside one container must reliably start both FastAPI and Next.js.
- Keep setup minimal; avoid introducing orchestration complexity beyond MVP needs.