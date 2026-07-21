import os
from contextlib import asynccontextmanager
from typing import Dict, Any, Optional, List
from fastapi import FastAPI, HTTPException, Response, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from backend.database import (
    init_db,
    get_board_json,
    save_board_json,
    create_card_db,
    update_card_db,
    delete_card_db,
    rename_column_db,
)
from backend.ai_service import generate_simple_prompt, generate_kanban_reasoning

# Ensure database is initialized
init_db()

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(title="Project Management MVP API", lifespan=lifespan)

class LoginRequest(BaseModel):
    username: str
    password: str

class CreateCardRequest(BaseModel):
    column_id: str
    title: str
    details: Optional[str] = ""

class UpdateCardRequest(BaseModel):
    title: Optional[str] = None
    details: Optional[str] = None
    column_id: Optional[str] = None

class RenameColumnRequest(BaseModel):
    title: str

class AIChatMessage(BaseModel):
    sender: str
    text: str

class AIChatRequest(BaseModel):
    message: str
    chat_history: Optional[List[AIChatMessage]] = None

@app.get("/api/health")
def health_check():
    return {"status": "ok"}

@app.get("/api/ai/test")
def ai_test(prompt: Optional[str] = "What is 2+2? Answer in one sentence."):
    result = generate_simple_prompt(prompt)
    return {"status": "success", "model": "gemini-2.5-flash", "response": result}

@app.post("/api/ai/chat")
def ai_chat(chat_req: AIChatRequest):
    current_board = get_board_json(username="user")
    history_list = [msg.dict() for msg in chat_req.chat_history] if chat_req.chat_history else []
    
    ai_result = generate_kanban_reasoning(
        user_message=chat_req.message,
        board_state=current_board,
        chat_history=history_list
    )
    
    # Process structured action if present
    if ai_result.action and ai_result.action.action_type != "NONE":
        action = ai_result.action
        act_type = action.action_type.upper()
        
        if act_type == "CREATE_CARD" and action.title:
            target_col = action.column_id or "col-backlog"
            create_card_db(column_id=target_col, title=action.title, details=action.details or "")
        elif act_type == "MOVE_CARD" and action.card_id and action.column_id:
            update_card_db(card_id=action.card_id, column_id=action.column_id)
        elif act_type == "EDIT_CARD" and action.card_id:
            update_card_db(card_id=action.card_id, title=action.title, details=action.details, column_id=action.column_id)
        elif act_type == "DELETE_CARD" and action.card_id:
            delete_card_db(card_id=action.card_id)
        elif act_type == "RENAME_COLUMN" and action.column_id and action.title:
            rename_column_db(column_id=action.column_id, title=action.title)
            
    updated_board = get_board_json(username="user")
    return {
        "status": "success",
        "response_text": ai_result.response_text,
        "action": ai_result.action.model_dump() if ai_result.action else None,
        "board": updated_board
    }

@app.post("/api/login")
def login(credentials: LoginRequest, response: Response):
    if credentials.username == "user" and credentials.password == "password":
        response.set_cookie(key="session_token", value="valid_user_token", httponly=True)
        return {"status": "success", "username": "user", "token": "valid_user_token"}
    raise HTTPException(status_code=401, detail="Invalid username or password")

@app.post("/api/logout")
def logout(response: Response):
    response.delete_cookie(key="session_token")
    return {"status": "success"}

@app.get("/api/board")
def get_board():
    board_data = get_board_json(username="user")
    if not board_data:
        raise HTTPException(status_code=404, detail="Board not found")
    return board_data

@app.put("/api/board")
def update_board(board_data: Dict[str, Any]):
    save_board_json(username="user", board_data=board_data)
    return {"status": "success"}

@app.post("/api/cards")
def create_card(card_req: CreateCardRequest):
    card_id = create_card_db(
        column_id=card_req.column_id,
        title=card_req.title,
        details=card_req.details or ""
    )
    return {"status": "success", "card_id": card_id}

@app.put("/api/cards/{card_id}")
def update_card(card_id: str, card_req: UpdateCardRequest):
    update_card_db(
        card_id=card_id,
        title=card_req.title,
        details=card_req.details,
        column_id=card_req.column_id
    )
    return {"status": "success"}

@app.delete("/api/cards/{card_id}")
def delete_card(card_id: str):
    delete_card_db(card_id=card_id)
    return {"status": "success"}

@app.put("/api/columns/{column_id}")
def rename_column(column_id: str, col_req: RenameColumnRequest):
    rename_column_db(column_id=column_id, title=col_req.title)
    return {"status": "success"}

STATIC_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "out"))

@app.middleware("http")
async def serve_static_middleware(request, call_next):
    response = await call_next(request)
    if response.status_code == 404 and os.path.exists(STATIC_DIR):
        path = request.url.path.lstrip("/")
        file_path = os.path.join(STATIC_DIR, path)
        if os.path.isfile(file_path):
            from fastapi.responses import FileResponse
            return FileResponse(file_path)
        index_path = os.path.join(STATIC_DIR, "index.html")
        if (path == "" or not os.path.exists(file_path)) and os.path.exists(index_path):
            from fastapi.responses import FileResponse
            return FileResponse(index_path)
    return response

@app.get("/", response_class=HTMLResponse)
def hello_world():
    index_path = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_path):
        from fastapi.responses import FileResponse
        return FileResponse(index_path)
    return """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Project Management MVP</title>
    <style>
        body {
            font-family: system-ui, -apple-system, sans-serif;
            background-color: #032147;
            color: #ffffff;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
        }
        .card {
            background-color: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            padding: 2rem 3rem;
            border-radius: 1rem;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        }
        h1 { color: #ecad0a; margin-bottom: 0.5rem; }
        p { color: #888888; }
        a { color: #209dd7; text-decoration: none; font-weight: bold; }
    </style>
</head>
<body>
    <div class="card">
        <h1>Hello World - Project Management MVP</h1>
        <p>Backend Scaffolding Active</p>
        <p><a href="/api/health">Check API Health (/api/health)</a></p>
    </div>
</body>
</html>"""
