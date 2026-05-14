import logging
import os
import time
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent.parent / ".env")

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.routes import router, limiter
from app.db import ensure_db
from app.session import JWT_SECRET, _DEFAULT_SECRET

logger = logging.getLogger("pm")


@asynccontextmanager
async def lifespan(app: FastAPI):
    ensure_db()
    if not JWT_SECRET or JWT_SECRET == _DEFAULT_SECRET:
        logger.warning("JWT_SECRET is not set or uses default value. Set JWT_SECRET in environment for production.")
    # Ensure upload directory exists
    upload_dir = os.environ.get("UPLOAD_DIR", os.path.join(os.path.dirname(__file__), "data", "uploads"))
    os.makedirs(upload_dir, exist_ok=True)
    yield


app = FastAPI(lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "").split(",") if os.environ.get("CORS_ORIGINS") else [],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    from fastapi.responses import JSONResponse
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    from fastapi.responses import JSONResponse
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration = time.time() - start
    if request.url.path.startswith("/api/"):
        logger.info("%s %s %d %.3fs", request.method, request.url.path, response.status_code, duration)
    return response


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
