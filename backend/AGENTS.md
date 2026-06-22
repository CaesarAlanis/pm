# Backend Notes

This folder contains the FastAPI backend application and Python project files.

## Scope

- Provide API endpoints under `/api/*`.
- Serve a simple verification page at `/demo`.
- Proxy all non-API routes to the Next.js runtime process.

## Structure

- `app/main.py`: FastAPI app entrypoint and proxy routes.
- `pyproject.toml`: Python project/dependency configuration for `uv`.

## Runtime Contract

- FastAPI listens on `FASTAPI_HOST:FASTAPI_PORT` (default `0.0.0.0:8000`).
- Next.js runtime is expected at `NEXT_BASE_URL` (default `http://127.0.0.1:3000`).