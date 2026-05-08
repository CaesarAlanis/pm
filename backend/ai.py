from __future__ import annotations

import os
from typing import Any

import httpx

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
DEFAULT_MODEL_NAMES = [
    "google/gemma-4-26b-a4b-it:free",
    "google/gemma-4-31b-it:free",
    "openrouter/free",
]


def get_model_names() -> list[str]:
    configured_models = os.getenv("OPENROUTER_MODEL")
    if not configured_models:
        return DEFAULT_MODEL_NAMES
    return [
        model.strip()
        for model in configured_models.split(",")
        if model.strip()
    ]


def _provider_error_message(error: httpx.HTTPStatusError) -> str:
    status_code = error.response.status_code
    if status_code == 401:
        return "OpenRouter rejected OPENROUTER_API_KEY. Create a valid OpenRouter key and restart the app."
    if status_code == 402:
        return (
            "OpenRouter returned 402 Payment Required. Add credits to the OpenRouter "
            f"account for {', '.join(get_model_names())}, or configure a model ending in :free."
        )

    try:
        body = error.response.json()
    except ValueError:
        body = None

    if isinstance(body, dict):
        provider_error = body.get("error")
        if isinstance(provider_error, dict):
            metadata = provider_error.get("metadata")
            if isinstance(metadata, dict) and isinstance(metadata.get("raw"), str):
                return metadata["raw"]
            if isinstance(provider_error.get("message"), str):
                return provider_error["message"]
        if isinstance(body.get("message"), str):
            return body["message"]

    return f"OpenRouter request failed with HTTP {status_code}"


async def ask_openrouter(messages: list[dict[str, str]]) -> str:
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise RuntimeError("OPENROUTER_API_KEY is not configured")
    if not api_key.startswith("sk-or-"):
        raise RuntimeError("OPENROUTER_API_KEY must be an OpenRouter key starting with sk-or-")

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    errors: list[str] = []
    async with httpx.AsyncClient(timeout=30.0) as client:
        for model_name in get_model_names():
            payload: dict[str, Any] = {
                "model": model_name,
                "messages": messages,
                "response_format": {"type": "json_object"},
            }
            try:
                response = await client.post(OPENROUTER_URL, json=payload, headers=headers)
                response.raise_for_status()
                data = response.json()
                choices = data.get("choices", [])
                if not choices:
                    raise RuntimeError("OpenRouter returned no choices")

                message = choices[0].get("message", {})
                content = message.get("content")
                if not isinstance(content, str) or not content.strip():
                    raise RuntimeError(f"{model_name} returned empty content")

                return content
            except httpx.HTTPStatusError as exc:
                errors.append(_provider_error_message(exc))
            except (httpx.TimeoutException, httpx.RequestError, RuntimeError) as exc:
                errors.append(str(exc))

    raise RuntimeError("; ".join(errors) or "OpenRouter returned no usable response")
