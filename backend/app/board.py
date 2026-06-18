from fastapi import APIRouter, Query

from app.board_store import get_board_for_user, upsert_board_for_user
from app.schemas import Board

board_router = APIRouter(prefix="/api")


@board_router.get("/board", response_model=Board)
def read_board(username: str = Query("user")) -> Board:
    return get_board_for_user(username)


@board_router.put("/board", response_model=Board)
def update_board(board: Board, username: str = Query("user")) -> Board:
    return upsert_board_for_user(username, board)
