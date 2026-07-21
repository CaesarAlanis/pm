import os
import json
from dotenv import load_dotenv
from google import genai
from google.genai import types
from pydantic import BaseModel, Field

ENV_LOCAL_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".env.local"))
load_dotenv(dotenv_path=ENV_LOCAL_PATH)

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

class BoardAction(BaseModel):
    action_type: str = Field(..., description="Action type")
    card_id: str | None = None
    column_id: str | None = None
    title: str | None = None
    details: str | None = None

class AIResponseSchema(BaseModel):
    response_text: str = Field(..., description="Natural language response")
    action: BoardAction | None = None

models_to_test = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-1.5-flash",
    "gemini-2.0-flash-exp"
]

print("=== TESTING GEMINI MODELS FOR SIMPLE CHAT & STRUCTURED OUTPUT ===")

for model in models_to_test:
    print(f"\nTesting model: {model}")

    # Test 1: Simple text prompt
    try:
        res1 = client.models.generate_content(
            model=model,
            contents="Hola, responde brevemente: ¿cuál es tu función principal en este proyecto de Kanban?"
        )
        print(f"  [Text Prompt SUCCESS] -> Response: {res1.text.strip()}")
    except Exception as e:
        print(f"  [Text Prompt FAILED] -> Error: {e}")

    # Test 2: Structured output with response_schema
    try:
        res2 = client.models.generate_content(
            model=model,
            contents="Hola, ¿qué puedes hacer?",
            config=types.GenerateContentConfig(
                system_instruction="Eres un asistente de Kanban.",
                response_mime_type="application/json",
                response_schema=AIResponseSchema,
                temperature=0.2
            )
        )
        print(f"  [Structured Output SUCCESS] -> Response: {res2.text.strip()}")
    except Exception as e:
        print(f"  [Structured Output FAILED] -> Error: {e}")
