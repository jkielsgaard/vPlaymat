"""Game action REST endpoints — draw, life, turn, tokens, zone viewers, and session control."""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from exceptions import EmptyLibraryError, ScryfallAPIError
from services.scryfall import search_tokens
from session_store import get_or_create_session, mark_dirty
from websocket_manager import broadcast_state

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


class ActiveViewerRequest(BaseModel):
    zone: str | None = None  # "graveyard" | "exile" | None


class SpectatorZoneViewingRequest(BaseModel):
    enabled: bool


@router.post("/draw")
async def draw(request: DrawRequest, session_id: str = Query(default="")):
    """Draw one or more cards from the top of the library into hand."""
    gs = get_or_create_session(session_id or "default")
    try:
        drawn = gs.draw(request.count)
    except EmptyLibraryError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    await broadcast_state(session_id or "default")
    return {"drawn": [c.to_dict() for c in drawn]}


@router.post("/shuffle")
async def shuffle(session_id: str = Query(default="")):
    """Shuffle the library into a random order."""
    gs = get_or_create_session(session_id or "default")
    gs.shuffle()
    await broadcast_state(session_id or "default")
    return {"library_size": len(gs.library_order)}


@router.post("/untap-all")
async def untap_all(session_id: str = Query(default="")):
    """Untap all cards currently on the battlefield."""
    gs = get_or_create_session(session_id or "default")
    gs.untap_all()
    await broadcast_state(session_id or "default")
    return {"ok": True}


@router.post("/commander-returns/reset")
async def reset_commander_returns(session_id: str = Query(default="")):
    """Reset the commander return counter to zero."""
    gs = get_or_create_session(session_id or "default")
    gs.commander_returns = 0
    await broadcast_state(session_id or "default")
    return {"ok": True}


@router.put("/life")
async def adjust_life(request: LifeRequest, session_id: str = Query(default="")):
    """Adjust life total by a positive or negative delta."""
    gs = get_or_create_session(session_id or "default")
    new_life = gs.adjust_life(request.delta)
    await broadcast_state(session_id or "default")
    return {"life": new_life}


@router.post("/mulligan")
async def mulligan(session_id: str = Query(default="")):
    """Return hand to library, shuffle, and draw one fewer card (London Mulligan)."""
    gs = get_or_create_session(session_id or "default")
    drawn = gs.mulligan()
    await broadcast_state(session_id or "default")
    return {"hand": [c.to_dict() for c in drawn]}


@router.post("/reveal")
async def reveal(request: RevealRequest, session_id: str = Query(default="")):
    """Return the top N cards of the library without moving them (used for reveal overlay)."""
    gs = get_or_create_session(session_id or "default")
    top_ids = gs.library_order[: request.count]
    top_cards = [gs.cards[cid].to_dict() for cid in top_ids]
    return {"cards": top_cards}


@router.post("/mode")
async def set_mode(request: ModeRequest, session_id: str = Query(default="")):
    """Switch between normal and commander game mode (adjusts starting life)."""
    gs = get_or_create_session(session_id or "default")
    try:
        gs.set_mode(request.mode)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    await broadcast_state(session_id or "default")
    return {"mode": gs.game_mode, "life": gs.life}


@router.post("/new")
async def new_game(session_id: str = Query(default="")):
    """Reset the board to a fresh game state using the same deck (draw opening hand)."""
    gs = get_or_create_session(session_id or "default")
    gs.new_game()
    gs.draw(7)
    await broadcast_state(session_id or "default")
    return {"ok": True}


@router.post("/poison")
async def adjust_poison(request: LifeRequest, session_id: str = Query(default="")):
    """Adjust poison counter total by a positive or negative delta."""
    gs = get_or_create_session(session_id or "default")
    total = gs.adjust_poison(request.delta)
    await broadcast_state(session_id or "default")
    return {"poison_counters": total}


@router.post("/next-turn")
async def next_turn(session_id: str = Query(default="")):
    """Advance to the next turn — untap all, increment turn counter, draw one card."""
    gs = get_or_create_session(session_id or "default")
    drawn = gs.next_turn()
    await broadcast_state(session_id or "default")
    return {"turn": gs.turn, "drawn": drawn.to_dict() if drawn else None}


@router.get("/tokens/search")
async def token_search(q: str = Query(default=""), session_id: str = Query(default="")):
    """Search Scryfall for token cards matching the given query string."""
    try:
        results = await search_tokens(q)
    except ScryfallAPIError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    return {"results": results}


class ScryRequest(BaseModel):
    keep_top: list[str] = []
    send_bottom: list[str] = []


@router.post("/scry")
async def scry(request: ScryRequest, session_id: str = Query(default="")):
    """Reorder the top of the library — keep cards on top or place them on the bottom."""
    gs = get_or_create_session(session_id or "default")
    gs.scry(request.keep_top, request.send_bottom)
    await broadcast_state(session_id or "default")
    return {"library_size": len(gs.library_order)}


class CreateTokenRequest(BaseModel):
    name: str
    image_uri: str
    x: float = 0.5
    y: float = 0.5


@router.post("/create-token")
async def create_token(request: CreateTokenRequest, session_id: str = Query(default="")):
    """Create a token card on the battlefield at the given position."""
    gs = get_or_create_session(session_id or "default")
    token = gs.create_token(
        name=request.name,
        image_uri=request.image_uri,
        x=request.x,
        y=request.y,
    )
    await broadcast_state(session_id or "default")
    return token.to_dict()


@router.post("/active-viewer")
async def set_active_viewer(request: ActiveViewerRequest, session_id: str = Query(default="")):
    """Set which zone viewer the player has open — broadcast to spectators."""
    gs = get_or_create_session(session_id or "default")
    gs.active_viewer = request.zone
    await broadcast_state(session_id or "default")
    return {"ok": True}


@router.post("/spectator-zone-viewing")
async def set_spectator_zone_viewing(request: SpectatorZoneViewingRequest, session_id: str = Query(default="")):
    """Toggle whether spectators can open zone viewers independently."""
    gs = get_or_create_session(session_id or "default")
    gs.spectator_zone_viewing = request.enabled
    await broadcast_state(session_id or "default")
    return {"ok": True}


@router.post("/clear")
async def clear_game(session_id: str = Query(default="")):
    """Wipe all cards and game data. Used when a session expires."""
    gs = get_or_create_session(session_id or "default")
    gs.clear_state()
    await broadcast_state(session_id or "default")
    return {"ok": True}


@router.post("/touch")
async def touch_session(session_id: str = Query(default="")):
    """Reset the session inactivity timer without broadcasting a state change."""
    sid = session_id or "default"
    gs = get_or_create_session(sid)
    gs.touch()
    mark_dirty(sid)
    return {"ok": True}


@router.post("/commander-damage")
async def add_commander_damage(request: CommanderDamageRequest, session_id: str = Query(default="")):
    """Record commander damage from a source and check for a 21-damage loss."""
    gs = get_or_create_session(session_id or "default")
    total = gs.add_commander_damage(request.source, request.amount)
    loss_source = gs.check_commander_loss()
    await broadcast_state(session_id or "default")
    return {
        "source": request.source,
        "total": total,
        "commander_loss": loss_source,
    }
