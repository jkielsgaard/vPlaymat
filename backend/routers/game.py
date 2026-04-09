from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from exceptions import EmptyLibraryError, ScryfallAPIError
from services.scryfall import search_tokens
from state import broadcast_state, game_state

router = APIRouter()


class DrawRequest(BaseModel):
    count: int = 1


class LifeRequest(BaseModel):
    delta: int


class RevealRequest(BaseModel):
    count: int


class ModeRequest(BaseModel):
    mode: str  # "normal" | "commander"


class CommanderDamageRequest(BaseModel):
    source: str
    amount: int


@router.post("/draw")
async def draw(request: DrawRequest):
    try:
        drawn = game_state.draw(request.count)
    except EmptyLibraryError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    await broadcast_state()
    return {"drawn": [c.to_dict() for c in drawn]}


@router.post("/shuffle")
async def shuffle():
    game_state.shuffle()
    await broadcast_state()
    return {"library_size": len(game_state.library_order)}


@router.post("/untap-all")
async def untap_all():
    game_state.untap_all()
    await broadcast_state()
    return {"ok": True}


@router.post("/commander-returns/reset")
async def reset_commander_returns():
    game_state.commander_returns = 0
    await broadcast_state()
    return {"ok": True}


@router.put("/life")
async def adjust_life(request: LifeRequest):
    new_life = game_state.adjust_life(request.delta)
    await broadcast_state()
    return {"life": new_life}


@router.post("/mulligan")
async def mulligan():
    drawn = game_state.mulligan()
    await broadcast_state()
    return {"hand": [c.to_dict() for c in drawn]}


@router.post("/reveal")
async def reveal(request: RevealRequest):
    top_ids = game_state.library_order[: request.count]
    top_cards = [game_state.cards[cid].to_dict() for cid in top_ids]
    return {"cards": top_cards}


@router.post("/mode")
async def set_mode(request: ModeRequest):
    try:
        game_state.set_mode(request.mode)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    await broadcast_state()
    return {"mode": game_state.game_mode, "life": game_state.life}


@router.post("/new")
async def new_game():
    game_state.new_game()
    game_state.draw(7)  # Opening hand
    await broadcast_state()
    return {"ok": True}


@router.post("/poison")
async def adjust_poison(request: LifeRequest):
    total = game_state.adjust_poison(request.delta)
    await broadcast_state()
    return {"poison_counters": total}


@router.post("/next-turn")
async def next_turn():
    drawn = game_state.next_turn()
    await broadcast_state()
    return {"turn": game_state.turn, "drawn": drawn.to_dict() if drawn else None}


@router.get("/tokens/search")
async def token_search(q: str = Query(default="")):
    try:
        results = await search_tokens(q)
    except ScryfallAPIError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    return {"results": results}


class ScryRequest(BaseModel):
    keep_top: list[str] = []
    send_bottom: list[str] = []


@router.post("/scry")
async def scry(request: ScryRequest):
    game_state.scry(request.keep_top, request.send_bottom)
    await broadcast_state()
    return {"library_size": len(game_state.library_order)}


class CreateTokenRequest(BaseModel):
    name: str
    image_uri: str
    x: float = 0.5
    y: float = 0.5


@router.post("/create-token")
async def create_token(request: CreateTokenRequest):
    token = game_state.create_token(
        name=request.name,
        image_uri=request.image_uri,
        x=request.x,
        y=request.y,
    )
    await broadcast_state()
    return token.to_dict()


@router.post("/commander-damage")
async def add_commander_damage(request: CommanderDamageRequest):
    total = game_state.add_commander_damage(request.source, request.amount)
    loss_source = game_state.check_commander_loss()
    await broadcast_state()
    return {
        "source": request.source,
        "total": total,
        "commander_loss": loss_source,
    }
