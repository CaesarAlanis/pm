# Backend Architecture & Guidelines

## Overview

The backend is built using Python 3.11+ and FastAPI. It relies on `uv` for fast package management.

## File Structure

- `main.py`: Entry point for the FastAPI server, routes, and static file mounting.
- `pyproject.toml`: Dependency specification managed via `uv`.

## Endpoints

- `GET /`: Serves static Next.js export frontend or fallback HTML.
- `GET /api/health`: Healthcheck endpoint returning `{"status": "ok"}`.

## Execution

Local development without Docker:
```bash
uvicorn backend.main:app --reload --port 8000
```