from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class Card(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    id: str
    title: str
    details: str


class Column(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    id: str
    title: str
    card_ids: list[str] = Field(alias="cardIds")


class Board(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    columns: list[Column]
    cards: dict[str, Card]
