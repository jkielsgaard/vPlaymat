import asyncio
import json
import logging
import os
from typing import Optional

logger = logging.getLogger("uvicorn.error")

from fastapi import FastAPI, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from routers import cards, deck, game
from state import broadcast_state, flush_loop, get_or_create_session, manager

APP_VERSION = "v1.8 alpha"

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
    asyncio.create_task(flush_loop())
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
    sid = session_id or "default"
    await manager.connect(websocket, sid)
    state = get_or_create_session(sid)

    # Push current state immediately on connect so a returning user sees their board
    await websocket.send_text(json.dumps(state.to_dict()))

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, sid)
