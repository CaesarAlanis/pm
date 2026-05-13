from fastapi import APIRouter

from app.routes.deps import limiter
from app.routes.auth import router as auth_router
from app.routes.board import router as board_router
from app.routes.ai import router as ai_router

router = APIRouter()

router.include_router(auth_router)
router.include_router(board_router)
router.include_router(ai_router)

__all__ = ["router", "limiter"]
