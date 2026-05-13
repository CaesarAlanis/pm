from contextlib import asynccontextmanager
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent.parent / ".env")

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.routes import router
from app.db import ensure_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    ensure_db()
    yield


app = FastAPI(lifespan=lifespan)

app.include_router(router, prefix="/api")

static_dir = Path(__file__).parent / "static"


@app.get("/")
async def serve_index():
    return FileResponse(static_dir / "index.html")


app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")
