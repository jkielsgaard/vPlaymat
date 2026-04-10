from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from models.card import Card
from services.deck_parser import parse_decklist
from services.scryfall import get_cards_batch
from state import broadcast_state, get_or_create_session

router = APIRouter()

VALID_MODES = {"normal", "commander"}


class DeckImportRequest(BaseModel):
    decklist: str
    game_mode: str = "normal"
    commander_name: Optional[str] = None
    opponent_count: int = 3
    opponent_names: list[str] = []


@router.post("/import")
async def import_deck(request: DeckImportRequest, session_id: str = Query(default="")):
    sid = session_id or "default"
    if request.game_mode not in VALID_MODES:
        raise HTTPException(status_code=422, detail=f"Invalid game mode: {request.game_mode}")

    parsed = parse_decklist(request.decklist)
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
    gs.game_mode = request.game_mode
    gs.opponent_count = request.opponent_count

    names = list(request.opponent_names[: request.opponent_count])
    while len(names) < request.opponent_count:
        names.append(f"Opponent {len(names) + 1}")
    gs.opponent_names = names

    gs.reset(cards)
    gs.shuffle()
    gs.draw(7)

    if request.commander_name:
        for card in gs.cards.values():
            if card.name.lower() == request.commander_name.lower():
                card.zone = "command"
                card.is_commander = True
                if card.id in gs.library_order:
                    gs.library_order.remove(card.id)
                break

    await broadcast_state(sid)
    return {"loaded": len(cards), "errors": errors}


@router.get("/state")
async def get_state(session_id: str = Query(default="")):
    gs = get_or_create_session(session_id or "default")
    return gs.to_dict()
