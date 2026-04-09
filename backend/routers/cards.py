from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from exceptions import CardNotFoundError
from state import broadcast_state, game_state

router = APIRouter()

VALID_ZONES = {"library", "hand", "battlefield", "graveyard", "exile", "command"}


class MoveRequest(BaseModel):
    zone: str
    x: Optional[float] = 0.0
    y: Optional[float] = 0.0
    to_top: bool = False  # when zone=="library", prepend instead of append


class CounterRequest(BaseModel):
    type: str
    delta: int


class PositionRequest(BaseModel):
    x: float
    y: float


@router.post("/{card_id}/tap")
async def tap_card(card_id: str):
    try:
        card = game_state.tap_card(card_id)
    except CardNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    await broadcast_state()
    return card.to_dict()


@router.post("/{card_id}/move")
async def move_card(card_id: str, request: MoveRequest):
    if request.zone not in VALID_ZONES:
        raise HTTPException(status_code=422, detail=f"Invalid zone: {request.zone}")
    try:
        card = game_state.move_card(
            card_id,
            request.zone,
            request.x or 0.0,
            request.y or 0.0,
            to_top=request.to_top,
        )
    except CardNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    await broadcast_state()
    return card.to_dict()


@router.post("/{card_id}/flip")
async def flip_card(card_id: str):
    """Toggle face-down / face-up (Morph, Manifest)."""
    try:
        card = game_state.flip_card(card_id)
    except CardNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    await broadcast_state()
    return card.to_dict()


@router.post("/{card_id}/transform")
async def transform_card(card_id: str):
    """Toggle front/back face for a double-faced card."""
    try:
        card = game_state.transform_card(card_id)
    except (CardNotFoundError, ValueError) as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    await broadcast_state()
    return card.to_dict()


@router.post("/{card_id}/counter")
async def add_counter(card_id: str, request: CounterRequest):
    try:
        card = game_state.add_counter(card_id, request.type, request.delta)
    except CardNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    await broadcast_state()
    return card.to_dict()


@router.delete("/{card_id}/counters")
async def remove_all_counters(card_id: str):
    try:
        card = game_state.remove_all_counters(card_id)
    except CardNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    await broadcast_state()
    return card.to_dict()


@router.post("/{card_id}/position")
async def update_position(card_id: str, request: PositionRequest):
    try:
        card = game_state.update_position(card_id, request.x, request.y)
    except CardNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    await broadcast_state()
    return card.to_dict()


