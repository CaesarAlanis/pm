from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.ai import ai_router
from app.board import board_router
from app.db import init_db

app = FastAPI(title="Project Management API")


@app.get("/api/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(board_router)
app.include_router(ai_router)


@app.on_event("startup")
def startup() -> None:
    init_db()

static_dir = Path(__file__).resolve().parent / "static"
app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")
