from fastapi import APIRouter

from app.routes.deps import limiter
from app.routes.auth import router as auth_router
from app.routes.board import router as board_router
from app.routes.ai import router as ai_router
from app.routes.collaboration import router as collab_router
from app.routes.card_detail import router as card_detail_router
from app.routes.notifications import router as notifications_router
from app.routes.template import router as template_router
from app.routes.cards import router as cards_router
from app.routes.analytics import router as analytics_router

router = APIRouter()

router.include_router(auth_router)
router.include_router(board_router)
router.include_router(ai_router)
router.include_router(collab_router)
router.include_router(card_detail_router)
router.include_router(notifications_router)
router.include_router(template_router)
router.include_router(cards_router)
router.include_router(analytics_router)

__all__ = ["router", "limiter"]
