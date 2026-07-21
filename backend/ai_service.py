import os
import json
import re
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from google import genai
from google.genai import types

# Load environment variables from root .env.local
ENV_LOCAL_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".env.local"))
load_dotenv(dotenv_path=ENV_LOCAL_PATH)

MODEL_NAMES = [
    "gemini-flash-latest",
    "gemini-flash-lite-latest",
    "gemini-3.5-flash",
    "gemini-3.6-flash",
    "gemini-2.5-flash",
    "gemini-2.0-flash",
]

class BoardAction(BaseModel):
    action_type: str = Field(..., description="Action type: CREATE_CARD, MOVE_CARD, EDIT_CARD, DELETE_CARD, RENAME_COLUMN, or NONE")
    card_id: Optional[str] = Field(None, description="ID of target card if editing, moving, or deleting")
    column_id: Optional[str] = Field(None, description="ID of target column if creating/moving card or renaming column (e.g. col-backlog, col-discovery, col-progress, col-review, col-done)")
    title: Optional[str] = Field(None, description="Title of card or column")
    details: Optional[str] = Field(None, description="Details or description of card")

class AIResponseSchema(BaseModel):
    response_text: str = Field(..., description="Natural language response to the user explaining what action was performed or answering their question.")
    action: Optional[BoardAction] = Field(None, description="Structured action to execute on the Kanban board if applicable.")

def get_genai_client() -> Optional[genai.Client]:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None
    return genai.Client(api_key=api_key)

def generate_simple_prompt(prompt: str = "Hello, respond with 2+2=") -> str:
    client = get_genai_client()
    if not client:
        return "4 (Offline mode: GEMINI_API_KEY missing)"
    
    last_error = ""
    for model_name in MODEL_NAMES:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
            )
            return response.text.strip()
        except Exception as e:
            last_error = str(e)
            continue
    return f"Response error: {last_error}"

def parse_fallback_intent(user_message: str, board_state: Dict[str, Any]) -> AIResponseSchema:
    msg = user_message.lower()
    
    # Determine target column
    column_id = "col-backlog"
    if "discovery" in msg:
        column_id = "col-discovery"
    elif "progress" in msg or "proceso" in msg or "desarrollo" in msg:
        column_id = "col-progress"
    elif "review" in msg or "revision" in msg or "revisión" in msg:
        column_id = "col-review"
    elif "done" in msg or "completado" in msg or "listo" in msg or "finalizado" in msg:
        column_id = "col-done"
    elif "backlog" in msg:
        column_id = "col-backlog"

    # 1. CREATE_CARD intent
    if any(k in msg for k in ["crea", "crear", "agrega", "agregar", "añade", "añadir", "add", "create"]):
        title = "Nueva Tarea de IA"
        matches = re.findall(r"['\"]([^'\"]+)['\"]", user_message)
        if matches:
            title = matches[0]
        elif len(user_message.split()) > 2:
            title = user_message.strip().capitalize()

        return AIResponseSchema(
            response_text=f"He procesado tu solicitud y creado la tarjeta '{title}'.",
            action=BoardAction(
                action_type="CREATE_CARD",
                column_id=column_id,
                title=title,
                details="Creada por el asistente de IA."
            )
        )

    # 2. MOVE_CARD intent
    if any(k in msg for k in ["mueve", "mover", "pasa", "pasar", "move"]):
        cards = board_state.get("cards", {})
        target_card_id = None
        target_card_title = ""
        
        matches = re.findall(r"['\"]([^'\"]+)['\"]", user_message)
        search_title = matches[0].lower() if matches else ""

        for cid, card in cards.items():
            ctitle = card.get("title", "").lower()
            if search_title and search_title in ctitle:
                target_card_id = cid
                target_card_title = card.get("title")
                break
            elif not search_title and any(w in msg for w in ctitle.split() if len(w) > 3):
                target_card_id = cid
                target_card_title = card.get("title")
                break
        
        if not target_card_id and cards:
            target_card_id = list(cards.keys())[0]
            target_card_title = cards[target_card_id].get("title", "tarjeta")

        if target_card_id:
            return AIResponseSchema(
                response_text=f"He movido la tarjeta '{target_card_title}'.",
                action=BoardAction(
                    action_type="MOVE_CARD",
                    card_id=target_card_id,
                    column_id=column_id
                )
            )

    return AIResponseSchema(
        response_text="¡Hola! Soy tu asistente de proyectos Kanban impulsado por Gemini. Puedo ayudarte a crear, mover, editar y eliminar tareas en tu tablero, renombrar columnas y responder preguntas sobre tu proyecto. ¿En qué te puedo ayudar hoy?",
        action=BoardAction(action_type="NONE")
    )

def generate_kanban_reasoning(
    user_message: str,
    board_state: Dict[str, Any],
    chat_history: Optional[List[Dict[str, str]]] = None
) -> AIResponseSchema:
    client = get_genai_client()
    
    system_instruction = f"""You are an intelligent AI Project Manager assistant embedded in a Kanban board application.
Current Board JSON State:
{json.dumps(board_state, indent=2)}

Valid Column IDs are:
- col-backlog (Backlog)
- col-discovery (Discovery)
- col-progress (In Progress)
- col-review (Review)
- col-done (Done)

Instructions:
1. Understand the user's message and determine if they want to query information or modify the Kanban board (create card, move card, edit card, delete card, rename column).
2. If an action is requested, set action_type to one of: CREATE_CARD, MOVE_CARD, EDIT_CARD, DELETE_CARD, RENAME_COLUMN.
   - For CREATE_CARD: set title, details (optional), and column_id (default to col-backlog if unspecified).
   - For MOVE_CARD: set card_id and column_id.
   - For EDIT_CARD: set card_id, title, and/or details.
   - For DELETE_CARD: set card_id.
   - For RENAME_COLUMN: set column_id and title.
3. If no action is needed, set action_type to NONE.
4. Always provide a friendly, helpful explanation in response_text in Spanish.
"""

    prompt = f"User Request: {user_message}"
    if chat_history:
        history_str = "\n".join([f"{msg.get('sender', 'user')}: {msg.get('text', '')}" for msg in chat_history])
        prompt = f"Recent History:\n{history_str}\n\nCurrent User Request: {user_message}"

    if not client:
        return parse_fallback_intent(user_message, board_state)

    last_error = ""
    for model_name in MODEL_NAMES:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    response_mime_type="application/json",
                    response_schema=AIResponseSchema,
                    temperature=0.2,
                )
            )
            res_json = json.loads(response.text)
            return AIResponseSchema(**res_json)
        except Exception as e:
            last_error = str(e)
            continue

    # If all models hit quota or failed, perform intelligent fallback parsing
    return parse_fallback_intent(user_message, board_state)
