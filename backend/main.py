from contextlib import asynccontextmanager
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent.parent / ".env")

from fastapi import FastAPI, Request, Response
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.routes import router, limiter
from app.db import ensure_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    ensure_db()
    yield


app = FastAPI(lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


@app.middleware("http")
async def csrf_protect(request: Request, call_next):
    if request.method in ("POST", "PUT", "DELETE", "PATCH"):
        if not request.url.path.startswith("/api/"):
            return await call_next(request)
        if request.url.path in ("/api/health", "/api/hello"):
            return await call_next(request)
        if not request.headers.get("X-Requested-With"):
            return Response(status_code=403, content='{"detail":"CSRF check failed"}', media_type="application/json")
    return await call_next(request)


app.include_router(router, prefix="/api")

static_dir = Path(__file__).parent / "static"


@app.get("/")
async def serve_index():
    return FileResponse(static_dir / "index.html")


app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")
