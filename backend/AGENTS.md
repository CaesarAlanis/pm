This folder contains the FastAPI backend that serves API routes and (for now)
an example HTML page at `/`.

## Structure

- `app/main.py` defines the FastAPI app, mounts the built frontend static
  files, and exposes API routes.
- `app/board.py` provides `/api/board` read/update endpoints.
- `app/board_store.py` handles SQLite persistence and seeding.
- `app/db.py` owns SQLite connection and schema initialization.
- `app/ai.py` contains the OpenRouter connectivity test route.
- `requirements.txt` lists backend dependencies for Docker installs.