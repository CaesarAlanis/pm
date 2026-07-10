# Backend agent guide

## Purpose

This directory contains the FastAPI backend for the project management MVP. The initial scaffold provides a minimal app entry point and a small set of example routes that can be expanded into the full persistence and AI workflow.

## Current structure

- main.py: FastAPI application entry point with health and demo endpoints.
- requirements.txt: Python dependencies for the backend.
- pyproject.toml: Optional project metadata for the backend.

## Current implementation notes

- The backend is intentionally minimal at this stage.
- The app exposes a health endpoint at /api/health and a demo route at /api/demo.
- The expected runtime target is a local containerized deployment, but the app can also run directly with Uvicorn.

## Working conventions

- Keep the backend simple and aligned with the MVP scope.
- Prefer small, testable endpoints over broad abstractions.
- Add tests when new routes or persistence logic are introduced.
- Follow the repository guidance to investigate root causes before changing behavior.
