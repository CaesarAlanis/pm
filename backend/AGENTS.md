# Backend Agent Guidance

## Purpose
This file describes the backend scaffold currently in `backend/` and explains the existing structure for the PM MVP backend.

## Backend architecture
- `backend/main.py`
  - FastAPI application entrypoint.
  - Initializes SQLite during app lifespan startup.
  - Serves the built Next.js static site from `backend/static/`.
  - Provides these API routes:
    - `GET /api/health` returns `{ "status": "ok" }`
    - `GET /api/hello` returns `{ "message": "hello world" }`
    - `GET /api/board/{username}` returns the user's board JSON
    - `POST /api/board/{username}` stores the user's board JSON
    - `POST /api/chat` sends board context to OpenRouter and returns a structured AI response

- `backend/db.py`
  - Creates and accesses the SQLite database.
  - Stores the full board as one JSON blob per user.
  - Reads `PM_DB_PATH` when provided; Docker scripts set this to `/app/data/pm.db`.

- `backend/ai.py`
  - Calls OpenRouter with the configured chat model.
  - Requires `OPENROUTER_API_KEY` from the runtime environment.
  - Defaults to a comma-separated free fallback list; set `OPENROUTER_MODEL` in `.env` to override it.

- `backend/pyproject.toml`
  - Declares backend dependencies.
  - Used by the `uv` package manager inside Docker.

## Docker and scripts
- `Dockerfile`
  - Builds the Next.js frontend first.
  - Copies the static export into the backend image.
  - Installs backend dependencies with `uv`.
  - Starts the app with `uv run --no-project uvicorn backend.main:app --host 0.0.0.0 --port 8000`.

- `.dockerignore`
  - Prevents node_modules, build artifacts, and Python environment files from being copied into the image.

- `scripts/start.sh`
  - Builds the Docker image and starts the container on port `8000`.
  - Mounts local `data/` into the container for SQLite persistence.
  - Passes root `.env` into Docker if it exists.

- `scripts/stop.sh`
  - Stops and removes the running Docker container named `pm-app`.

## Current state
- Backend persistence and AI connectivity routes are in place.
- The AI route validates structured board updates before returning them to the frontend.
