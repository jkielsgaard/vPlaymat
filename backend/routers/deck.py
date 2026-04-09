from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from models.card import Card
from services.deck_parser import parse_decklist
from services.scryfall import get_cards_batch
from state import broadcast_state, game_state

router = APIRouter()

VALID_MODES = {"normal", "commander"}


class DeckImportRequest(BaseModel):
    decklist: str
    game_mode: str = "normal"
    commander_name: Optional[str] = None
    opponent_count: int = 3
    opponent_names: list[str] = []


@router.post("/import")
async def import_deck(request: DeckImportRequest):
    if request.game_mode not in VALID_MODES:
        raise HTTPException(status_code=422, detail=f"Invalid game mode: {request.game_mode}")

    parsed = parse_decklist(request.decklist)
    if not parsed:
        raise HTTPException(status_code=422, detail="No valid cards found in decklist")

    cards: list[Card] = []
    errors: list[str] = []

    # Batch-fetch all unique card names in 1–2 Scryfall API calls
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

    game_state.game_mode = request.game_mode
    game_state.opponent_count = request.opponent_count

    # Build opponent names list, padding with defaults if needed
    names = list(request.opponent_names[: request.opponent_count])
    while len(names) < request.opponent_count:
        names.append(f"Opponent {len(names) + 1}")
    game_state.opponent_names = names

    game_state.reset(cards)
    game_state.shuffle()
    game_state.draw(7)  # Opening hand

    # Move the designated commander card to the command zone and flag it
    if request.commander_name:
        for card in game_state.cards.values():
            if card.name.lower() == request.commander_name.lower():
                card.zone = "command"
                card.is_commander = True
                if card.id in game_state.library_order:
                    game_state.library_order.remove(card.id)
                break

    await broadcast_state()
    return {"loaded": len(cards), "errors": errors}


@router.get("/state")
async def get_state():
    return game_state.to_dict()
