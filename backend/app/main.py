import os
import secrets

import httpx
from fastapi import FastAPI, Header, HTTPException, Request, status
from fastapi.responses import HTMLResponse, Response
from pydantic import BaseModel

from app.kanban_store import KanbanStore

NEXT_BASE_URL = os.getenv("NEXT_BASE_URL", "http://127.0.0.1:3000").rstrip("/")
DB_PATH = os.getenv("KANBAN_DB_PATH", "/app/backend/data/kanban.db")
AUTH_USERNAME = "user"
AUTH_PASSWORD = "password"
ACCESS_TOKEN = secrets.token_urlsafe(32)

app = FastAPI(title="Project Management MVP API")
store = KanbanStore(DB_PATH)


class LoginRequest(BaseModel):
    username: str
    password: str


class RenameColumnRequest(BaseModel):
    column_id: str
    title: str


class CreateCardRequest(BaseModel):
    column_id: str
    title: str
    details: str = ""


class UpdateCardRequest(BaseModel):
    card_id: str
    title: str | None = None
    details: str | None = None


class DeleteCardRequest(BaseModel):
    card_id: str


class MoveCardRequest(BaseModel):
    card_id: str
    target_column_id: str
    target_index: int | None = None


def _validate_bearer_token(authorization: str | None) -> None:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header",
        )
    token = authorization.removeprefix("Bearer ").strip()
    if token != ACCESS_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )


@app.on_event("startup")
async def on_startup() -> None:
    store.bootstrap()


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/hello")
async def hello() -> dict[str, str]:
    return {"message": "hello world", "service": "fastapi"}


@app.post("/api/auth/login")
async def login(payload: LoginRequest) -> dict[str, str]:
    if payload.username != AUTH_USERNAME or payload.password != AUTH_PASSWORD:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )
    return {"access_token": ACCESS_TOKEN, "token_type": "bearer"}


@app.get("/api/auth/session")
async def session(authorization: str | None = Header(default=None)) -> dict[str, str]:
    _validate_bearer_token(authorization)
    return {"status": "authenticated"}


@app.get("/api/board")
async def get_board(authorization: str | None = Header(default=None)) -> dict:
    _validate_bearer_token(authorization)
    return store.get_board(AUTH_USERNAME)


@app.patch("/api/board/columns/rename")
async def rename_column(
    payload: RenameColumnRequest,
    authorization: str | None = Header(default=None),
) -> dict:
    _validate_bearer_token(authorization)
    if not payload.title.strip():
        raise HTTPException(status_code=400, detail="Column title is required")
    try:
        return store.rename_column(AUTH_USERNAME, payload.column_id, payload.title.strip())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/board/cards")
async def create_card(
    payload: CreateCardRequest,
    authorization: str | None = Header(default=None),
) -> dict:
    _validate_bearer_token(authorization)
    if not payload.title.strip():
        raise HTTPException(status_code=400, detail="Card title is required")
    try:
        return store.create_card(
            AUTH_USERNAME,
            payload.column_id,
            payload.title.strip(),
            payload.details.strip(),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.patch("/api/board/cards")
async def update_card(
    payload: UpdateCardRequest,
    authorization: str | None = Header(default=None),
) -> dict:
    _validate_bearer_token(authorization)
    if payload.title is None and payload.details is None:
        raise HTTPException(status_code=400, detail="No fields to update")
    try:
        return store.update_card(
            AUTH_USERNAME,
            payload.card_id,
            payload.title.strip() if payload.title is not None else None,
            payload.details.strip() if payload.details is not None else None,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.delete("/api/board/cards")
async def delete_card(
    payload: DeleteCardRequest,
    authorization: str | None = Header(default=None),
) -> dict:
    _validate_bearer_token(authorization)
    try:
        return store.delete_card(AUTH_USERNAME, payload.card_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/board/cards/move")
async def move_card(
    payload: MoveCardRequest,
    authorization: str | None = Header(default=None),
) -> dict:
    _validate_bearer_token(authorization)
    if payload.target_index is not None and payload.target_index < 0:
        raise HTTPException(status_code=400, detail="target_index cannot be negative")
    try:
        return store.move_card(
            AUTH_USERNAME,
            payload.card_id,
            payload.target_column_id,
            payload.target_index,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/demo", response_class=HTMLResponse)
async def demo_page() -> str:
    return """
<!doctype html>
<html lang=\"en\">
  <head>
    <meta charset=\"utf-8\" />
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
    <title>PM MVP Demo</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 2rem; line-height: 1.4; }
      h1 { margin-bottom: 0.5rem; }
      pre { background: #f4f4f4; padding: 1rem; border-radius: 8px; }
      button { padding: 0.5rem 0.75rem; cursor: pointer; }
    </style>
  </head>
  <body>
    <h1>Hello World</h1>
    <p>This page verifies FastAPI is running inside Docker.</p>
    <button id=\"call-api\" type=\"button\">Call /api/hello</button>
    <pre id=\"result\">Click the button to fetch API data.</pre>
    <script>
      const button = document.getElementById(\"call-api\");
      const result = document.getElementById(\"result\");
      button.addEventListener(\"click\", async () => {
        result.textContent = \"Loading...\";
        try {
          const response = await fetch(\"/api/hello\");
          const body = await response.json();
          result.textContent = JSON.stringify(body, null, 2);
        } catch (error) {
          result.textContent = String(error);
        }
      });
    </script>
  </body>
</html>
"""


async def _proxy_to_next(request: Request, path: str) -> Response:
    target_url = f"{NEXT_BASE_URL}/{path.lstrip('/')}"
    query = request.url.query
    if query:
        target_url = f"{target_url}?{query}"

    headers = dict(request.headers)
    headers.pop("host", None)
    body = await request.body()

    async with httpx.AsyncClient(follow_redirects=False, timeout=60.0) as client:
        upstream = await client.request(
            method=request.method,
            url=target_url,
            headers=headers,
            content=body,
        )

    excluded_headers = {
        "connection",
        "keep-alive",
        "proxy-authenticate",
        "proxy-authorization",
        "te",
        "trailer",
        "transfer-encoding",
        "upgrade",
        "content-encoding",
        "content-length",
    }
    passthrough_headers = {
        key: value
        for key, value in upstream.headers.items()
        if key.lower() not in excluded_headers
    }

    return Response(
        content=upstream.content,
        status_code=upstream.status_code,
        headers=passthrough_headers,
        media_type=upstream.headers.get("content-type"),
    )


@app.api_route(
    "/",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
)
async def proxy_root(request: Request) -> Response:
    return await _proxy_to_next(request, "")


@app.api_route(
    "/{full_path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
)
async def proxy_next(full_path: str, request: Request) -> Response:
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="Not found")
    return await _proxy_to_next(request, full_path)
