import json
import logging
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Literal
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi import HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from pydantic import ValidationError
from pydantic import model_validator

from backend import ai
from backend import db

logger = logging.getLogger(__name__)

project_root = Path(__file__).resolve().parent.parent
load_dotenv(project_root / ".env")
frontend_static_dir = project_root / "frontend" / "out"
static_dir = frontend_static_dir if frontend_static_dir.exists() else Path(__file__).parent / "static"


class CardModel(BaseModel):
    id: str
    title: str
    details: str = ""


class ColumnModel(BaseModel):
    id: str
    title: str
    cardIds: list[str]


class BoardModel(BaseModel):
    columns: list[ColumnModel]
    cards: dict[str, CardModel]

    @model_validator(mode="after")
    def card_ids_must_reference_cards(self) -> "BoardModel":
        seen_card_ids: set[str] = set()
        for column in self.columns:
            for card_id in column.cardIds:
                if card_id not in self.cards:
                    raise ValueError(f"Column references missing card {card_id}")
                if card_id in seen_card_ids:
                    raise ValueError(f"Card {card_id} appears in more than one column")
                seen_card_ids.add(card_id)
        return self


class BoardPayload(BaseModel):
    board: BoardModel


class BoardResponse(BaseModel):
    user: str
    board: BoardModel


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    board: BoardModel
    conversation: list[ChatMessage]
    message: str


class ChatResponse(BaseModel):
    message: str
    boardUpdate: BoardModel | None


@asynccontextmanager
async def lifespan(_: FastAPI):
    db.init_db()
    yield


app = FastAPI(title="PM Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _extract_json_object(raw_text: str) -> dict[str, Any]:
    text = raw_text.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        if len(lines) >= 3:
            text = "\n".join(lines[1:-1]).strip()

    parsed = json.loads(text)
    if not isinstance(parsed, dict):
        raise ValueError("response is not a JSON object")
    return parsed


def _validated_board_or_default(board_data: dict[str, Any] | None) -> BoardModel:
    if board_data is None:
        return BoardModel.model_validate(db.DEFAULT_BOARD)
    try:
        return BoardModel.model_validate(board_data)
    except ValidationError:
        logger.warning("Stored board failed Pydantic validation; returning default board. Data: %s", board_data)
        return BoardModel.model_validate(db.DEFAULT_BOARD)


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/hello")
async def hello() -> dict[str, str]:
    return {"message": "hello world"}


@app.get("/api/board/{username}", response_model=BoardResponse)
async def get_board(username: str) -> BoardResponse:
    board_data = db.get_board(username)
    return BoardResponse(user=username, board=_validated_board_or_default(board_data))


@app.post("/api/board/{username}", response_model=BoardResponse)
async def save_board(username: str, payload: BoardPayload) -> BoardResponse:
    db.save_board(username, payload.board.model_dump())
    return BoardResponse(user=username, board=payload.board)


@app.post("/api/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest) -> ChatResponse:
    messages: list[dict[str, str]] = [
        {
            "role": "system",
            "content": (
                "You are a Kanban assistant. Respond with JSON only. "
                "Output format: {\"message\": string, \"boardUpdate\": object|null}. "
                "Only include boardUpdate when a board change is needed. "
                "When included, boardUpdate must be the complete board JSON with columns and cards."
            ),
        },
        {
            "role": "user",
            "content": (
                "Current board JSON:\n"
                f"{payload.board.model_dump_json()}\n\n"
                "Conversation history JSON:\n"
                f"{json.dumps([message.model_dump() for message in payload.conversation])}\n\n"
                f"User message:\n{payload.message}"
            ),
        },
    ]

    try:
        raw_answer = await ai.ask_openrouter(messages)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AI request failed: {exc}") from exc

    try:
        parsed = _extract_json_object(raw_answer)
    except (json.JSONDecodeError, ValueError) as exc:
        raise HTTPException(status_code=502, detail="AI returned a non-JSON response") from exc

    message = parsed.get("message")
    if not isinstance(message, str) or not message.strip():
        raise HTTPException(status_code=502, detail="AI request failed: invalid message field")

    board_update = parsed.get("boardUpdate")
    try:
        board_update = BoardModel.model_validate(board_update) if board_update else None
    except ValidationError:
        board_update = None

    return ChatResponse(message=message, boardUpdate=board_update)


app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")
