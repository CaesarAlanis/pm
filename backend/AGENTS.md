# Backend

FastAPI application serving the PM app API and static frontend files.

## Structure

```
backend/
  main.py            -- FastAPI app, lifespan, static file serving
  app/
    routes.py        -- API route definitions (auth + board CRUD)
    session.py       -- In-memory session store (cookie-based auth)
    db.py            -- SQLite database queries and initialization
    db/
      schema.sql     -- Table definitions
      seed.sql       -- Default user + board seed data
  static/            -- Built Next.js frontend (served at /)
  tests/
    test_routes.py   -- Basic endpoint tests
    test_auth.py     -- Auth endpoint tests
    test_boards.py   -- Board CRUD endpoint tests
  pyproject.toml     -- Dependencies (fastapi, uvicorn, pytest)
```

## Running

Inside Docker: `uv run uvicorn main:app --host 0.0.0.0 --port 8000`

## API Endpoints

- GET /api/health -- health check
- GET / -- serves static frontend
- POST /api/auth/login -- login with username/password, sets session cookie
- POST /api/auth/logout -- clears session
- GET /api/auth/me -- returns current user
- GET /api/boards -- returns authenticated user's board with columns and cards
- PUT /api/boards/columns/{id} -- rename a column
- POST /api/boards/cards -- add a card
- PUT /api/boards/cards/{id} -- update card title/details
- DELETE /api/boards/cards/{id} -- delete a card
- PUT /api/boards/cards/{id}/move -- move card to column at position

All /api/boards/* endpoints require authentication.

## Database

SQLite at `data/pm.db` (or DB_PATH env var). Auto-created on startup.
See docs/DATABASE.md for schema details.

## Testing

`uv run pytest` with `pytest-cov` for coverage. Target: 80%. Currently 96%.
