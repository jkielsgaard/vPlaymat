"""Deck import REST endpoints — parse a decklist, fetch card data, and reset the session."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel

from dependencies import forbid_spectator_token
from models.card import Card
from services.deck_parser import parse_decklist
from services.scryfall import get_cards_batch
from session_store import get_or_create_session
from websocket_manager import broadcast_state
from limiter import limiter

router = APIRouter(dependencies=[Depends(forbid_spectator_token)])

VALID_MODES = {"normal", "commander"}


class DeckImportRequest(BaseModel):
    decklist: str
    game_mode: str = "normal"
    commander_name: Optional[str] = None
    opponent_count: int = 3
    opponent_names: list[str] = []


@router.post("/import")
@limiter.limit("5/minute")
async def import_deck(request: Request, body: DeckImportRequest, session_id: str = Query(default="")):
    """Parse a decklist, fetch card images from Scryfall, and reset the session with the new deck."""
    sid = session_id or "default"
    if body.game_mode not in VALID_MODES:
        raise HTTPException(status_code=422, detail=f"Invalid game mode: {body.game_mode}")

    parsed = parse_decklist(body.decklist)
    if not parsed:
        raise HTTPException(status_code=422, detail="No valid cards found in decklist")

    cards: list[Card] = []
    errors: list[str] = []

    unique_names = list({name for name, _ in parsed})
    found, not_found_names = await get_cards_batch(unique_names)
    for nf in not_found_names:
        errors.append(f"Card not found: {nf}")

    for name, count in parsed:
        card_data = found.get(name)
        if card_data:
            for _ in range(count):
                cards.append(
                    Card(
                        name=card_data["name"],
                        image_uri=card_data["image_uri"],
                        back_image_uri=card_data.get("back_image_uri", ""),
                        zone="library",
                    )
                )
        else:
            if f"Card not found: {name}" not in errors:
                errors.append(f"Card not found: {name}")

    if not cards:
        raise HTTPException(
            status_code=422,
            detail=f"No cards could be loaded. Errors: {errors}",
        )

    gs = get_or_create_session(sid)

    names = list(body.opponent_names[: body.opponent_count])
    while len(names) < body.opponent_count:
        names.append(f"Opponent {len(names) + 1}")

    gs.reset_deck(cards, body.game_mode, body.opponent_count, names)
    gs.shuffle()
    gs.draw(7)

    if body.commander_name:
        for card in gs.cards.values():
            if card.name.lower() == body.commander_name.lower():
                card.zone = "command"
                card.is_commander = True
                if card.id in gs.library_order:
                    gs.library_order.remove(card.id)
                break

    await broadcast_state(sid)
    return {"loaded": len(cards), "errors": errors}


@router.get("/state")
async def get_state(session_id: str = Query(default="")):
    """Return the current game state as a JSON object (REST fallback; WebSocket is preferred)."""
    gs = get_or_create_session(session_id or "default")
    return gs.to_dict()
