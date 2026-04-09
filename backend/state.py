import json
import os
from typing import Set

from fastapi import WebSocket

from models.game_state import GameState

# Singleton game state — lives for the lifetime of the process
game_state = GameState()


class ConnectionManager:
    def __init__(self) -> None:
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.add(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        self.active_connections.discard(websocket)

    async def broadcast(self, data: str) -> None:
        dead: Set[WebSocket] = set()
        for connection in self.active_connections:
            try:
                await connection.send_text(data)
            except Exception:
                dead.add(connection)
        for conn in dead:
            self.active_connections.discard(conn)


manager = ConnectionManager()


async def broadcast_state() -> None:
    """Serialise current game state and push to all WS clients.
    Also updates the session last-active timestamp so the 3-hour inactivity
    timer resets on every game action."""
    # Skip broadcast during test runs to avoid async complexity
    if os.getenv("TESTING"):
        return
    game_state.touch()
    await manager.broadcast(json.dumps(game_state.to_dict()))
