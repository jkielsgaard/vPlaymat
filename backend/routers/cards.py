from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from exceptions import CardNotFoundError
from state import broadcast_state, get_or_create_session

router = APIRouter()

VALID_ZONES = {"library", "hand", "battlefield", "graveyard", "exile", "command"}


class MoveRequest(BaseModel):
    zone: str
    x: Optional[float] = 0.0
    y: Optional[float] = 0.0
    to_top: bool = False


class CounterRequest(BaseModel):
    type: str
    delta: int


class PositionRequest(BaseModel):
    x: float
    y: float


@router.post("/{card_id}/tap")
async def tap_card(card_id: str, session_id: str = Query(default="")):
    gs = get_or_create_session(session_id or "default")
    try:
        card = gs.tap_card(card_id)
    except CardNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    await broadcast_state(session_id or "default")
    return card.to_dict()


@router.post("/{card_id}/move")
async def move_card(card_id: str, request: MoveRequest, session_id: str = Query(default="")):
    if request.zone not in VALID_ZONES:
        raise HTTPException(status_code=422, detail=f"Invalid zone: {request.zone}")
    gs = get_or_create_session(session_id or "default")
    try:
        card = gs.move_card(
            card_id,
            request.zone,
            request.x or 0.0,
            request.y or 0.0,
            to_top=request.to_top,
        )
    except CardNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    await broadcast_state(session_id or "default")
    return card.to_dict()


@router.post("/{card_id}/flip")
async def flip_card(card_id: str, session_id: str = Query(default="")):
    gs = get_or_create_session(session_id or "default")
    try:
        card = gs.flip_card(card_id)
    except CardNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    await broadcast_state(session_id or "default")
    return card.to_dict()


@router.post("/{card_id}/transform")
async def transform_card(card_id: str, session_id: str = Query(default="")):
    gs = get_or_create_session(session_id or "default")
    try:
        card = gs.transform_card(card_id)
    except (CardNotFoundError, ValueError) as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    await broadcast_state(session_id or "default")
    return card.to_dict()


@router.post("/{card_id}/counter")
async def add_counter(card_id: str, request: CounterRequest, session_id: str = Query(default="")):
    gs = get_or_create_session(session_id or "default")
    try:
        card = gs.add_counter(card_id, request.type, request.delta)
    except CardNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    await broadcast_state(session_id or "default")
    return card.to_dict()


@router.delete("/{card_id}/counters")
async def remove_all_counters(card_id: str, session_id: str = Query(default="")):
    gs = get_or_create_session(session_id or "default")
    try:
        card = gs.remove_all_counters(card_id)
    except CardNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    await broadcast_state(session_id or "default")
    return card.to_dict()


@router.post("/{card_id}/position")
async def update_position(card_id: str, request: PositionRequest, session_id: str = Query(default="")):
    gs = get_or_create_session(session_id or "default")
    try:
        card = gs.update_position(card_id, request.x, request.y)
    except CardNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    await broadcast_state(session_id or "default")
    return card.to_dict()
