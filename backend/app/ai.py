from __future__ import annotations

import os

import httpx
from fastapi import APIRouter, HTTPException

try:
    from dotenv import load_dotenv
except ImportError:  # pragma: no cover - optional
    load_dotenv = None

ai_router = APIRouter(prefix="/api/ai")

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_MODEL = "openai/gpt-oss-120b"


def get_api_key() -> str | None:
    if load_dotenv:
        load_dotenv()
    return os.environ.get("OPENROUTER_API_KEY")


@ai_router.post("/test")
def test_ai() -> dict[str, str]:
    api_key = get_api_key()
    if not api_key:
        raise HTTPException(status_code=500, detail="OPENROUTER_API_KEY is missing")

    payload = {
        "model": OPENROUTER_MODEL,
        "messages": [{"role": "user", "content": "What is 2+2? Respond with only the number."}],
        "max_tokens": 10,
        "temperature": 0,
    }
    headers = {"Authorization": f"Bearer {api_key}"}

    with httpx.Client(timeout=20) as client:
        response = client.post(OPENROUTER_URL, json=payload, headers=headers)
    if response.status_code >= 400:
        raise HTTPException(status_code=502, detail=response.text)

    data = response.json()
    content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
    return {"result": content.strip()}
