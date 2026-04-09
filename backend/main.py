import json
import logging
import os
from typing import Optional

logger = logging.getLogger("uvicorn.error")

from fastapi import FastAPI, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from routers import cards, deck, game
from state import broadcast_state, game_state, manager

APP_VERSION = "v1.5 alpha"

app = FastAPI(title="vPlaymat API")

# ALLOWED_ORIGINS can be overridden via environment variable for production.
# Multiple origins are comma-separated, e.g. "http://localhost,https://example.com"
_raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173")
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(deck.router, prefix="/deck", tags=["deck"])
app.include_router(game.router, prefix="/game", tags=["game"])
app.include_router(cards.router, prefix="/cards", tags=["cards"])


@app.on_event("startup")
async def on_startup() -> None:
    public_url = os.getenv("PUBLIC_URL", "")
    if public_url:
        logger.info("vPlaymat ready — open %s in your browser  [%s]", public_url, APP_VERSION)
    else:
        logger.info(
            "vPlaymat backend running on port 8000. "
            "In production (docker-compose.prod.yml) open http://localhost:8080 — "
            "nginx proxies port 8080 → this backend."
        )


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    session_id: Optional[str] = Query(default=None),
):
    await manager.connect(websocket)

    # ── Session management ──────────────────────────────────────────────
    # If the incoming session_id differs from the current session:
    #   • If the existing session has expired (or never existed) → clear state
    #     so the new session starts fresh.
    #   • Otherwise keep the existing game state (e.g. two browser windows,
    #     or a backend restart where the client reconnects quickly).
    if session_id and session_id != game_state.session_id:
        # A known prior session exists → clear state so the new session starts fresh.
        # If session_id is None (backend just started) we just adopt the connecting session
        # without resetting anything (the state is already empty after a restart).
        if game_state.session_id is not None:
            game_state.clear_state()
        game_state.session_id = session_id

    game_state.touch()

    # Push current state immediately on connect
    await websocket.send_text(json.dumps(game_state.to_dict()))

    try:
        while True:
            # Keep the connection alive; client messages are ignored
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
