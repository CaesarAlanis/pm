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

working_models = [
    "gemini-flash-latest",
    "gemini-flash-lite-latest",
    "gemini-3.5-flash",
]

print("=== TESTING WORKING MODELS WITH STRUCTURED OUTPUT ===")

for model in working_models:
    print(f"\nTesting structured output on model: {model}")
    try:
        res = client.models.generate_content(
            model=model,
            contents="Hola, ¿qué puedes hacer en este proyecto de Kanban?",
            config=types.GenerateContentConfig(
                system_instruction="Eres un asistente de Kanban.",
                response_mime_type="application/json",
                response_schema=AIResponseSchema,
                temperature=0.2
            )
        )
        print(f"[SUCCESS] ({model}):")
        print(res.text.strip())
    except Exception as e:
        print(f"[FAILED] ({model}): {e}")
