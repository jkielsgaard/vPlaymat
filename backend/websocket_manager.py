"""WebSocket connection manager — per-session connection tracking and state broadcasting."""
import json
import os
from typing import Dict, Set

from fastapi import WebSocket

from session_store import get_or_create_session, mark_dirty

# ---------------------------------------------------------------------------
# Connection manager
# ---------------------------------------------------------------------------

class ConnectionManager:
    """Tracks active WebSocket connections per session and broadcasts state updates."""

    def __init__(self) -> None:
        # session_id → set of active WebSocket connections
        self._sessions: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, session_id: str) -> None:
        """Accept and register a new WebSocket connection for a session."""
        await websocket.accept()
        if session_id not in self._sessions:
            self._sessions[session_id] = set()
        self._sessions[session_id].add(websocket)

    def disconnect(self, websocket: WebSocket, session_id: str) -> None:
        """Remove a WebSocket connection from the session registry."""
        if session_id in self._sessions:
            self._sessions[session_id].discard(websocket)

    async def broadcast_to_session(self, session_id: str, data: str) -> None:
        """Send a message to all active connections for a session; prune dead ones."""
        if session_id not in self._sessions:
            return
        dead: Set[WebSocket] = set()
        for connection in self._sessions[session_id]:
            try:
                await connection.send_text(data)
            except Exception:
                dead.add(connection)
        for conn in dead:
            self._sessions[session_id].discard(conn)


manager = ConnectionManager()


async def broadcast_state(session_id: str) -> None:
    """Serialise the session's game state and push it to all WebSocket clients for that session."""
    if os.getenv("TESTING"):
        return
    state = get_or_create_session(session_id)
    state.touch()
    mark_dirty(session_id)
    await manager.broadcast_to_session(session_id, json.dumps(state.to_dict()))
