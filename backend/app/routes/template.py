import os

from fastapi import APIRouter, Cookie, HTTPException
from pydantic import BaseModel, field_validator

from app.routes.deps import require_user
from app.db import get_templates, get_template_by_id, add_column

router = APIRouter()


@router.get("/templates")
async def list_templates(session_token: str | None = Cookie(None)):
    require_user(session_token)
    templates = get_templates()
    return {"templates": templates}


class CreateFromTemplateBody(BaseModel):
    title: str | None = None
    template_id: str

    @field_validator("template_id")
    @classmethod
    def template_id_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Template ID is required")
        return v.strip()
