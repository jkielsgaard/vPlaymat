import asyncio
import json
import logging
import os
import re
from typing import Dict, Optional, Set

from fastapi import WebSocket

from models.game_state import GameState

logger = logging.getLogger("uvicorn.error")

# Directory where session JSON files are stored.
# Override with SESSION_DIR env var; defaults to /app/data/sessions inside the container.
SESSION_DIR = os.getenv("SESSION_DIR", "/app/data/sessions")

# How often (seconds) a dirty session is flushed to disk.
_FLUSH_INTERVAL = 5.0

# Only accept session IDs that are valid UUID v4 strings to prevent path traversal.
_UUID_RE = re.compile(
    r'^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
)


def _sanitize_session_id(session_id: str) -> str:
    """Return the session_id unchanged if it is a valid UUID v4, else return 'default'."""
    if _UUID_RE.match(session_id.lower()):
        return session_id.lower()
    return "default"


# ---------------------------------------------------------------------------
# File persistence helpers
# ---------------------------------------------------------------------------

def _session_path(session_id: str) -> str:
    # Guard against path traversal — only valid UUID v4 strings are allowed as filenames.
    safe_id = session_id if _UUID_RE.match(session_id.lower()) else "default"
    return os.path.join(SESSION_DIR, f"{safe_id}.json")


def _ensure_dir() -> None:
    os.makedirs(SESSION_DIR, exist_ok=True)


def _save_session(session_id: str, state: GameState) -> None:
    """Write session state to disk synchronously."""
    try:
        _ensure_dir()
        path = _session_path(session_id)
        tmp = path + ".tmp"
        with open(tmp, "w") as f:
            json.dump(state.to_persist_dict(), f)
        os.replace(tmp, path)  # atomic on POSIX
    except Exception as exc:
        logger.warning("Failed to persist session %s: %s", session_id, exc)


def _load_session(session_id: str) -> Optional[GameState]:
    """Load a session from disk. Returns None if file missing or corrupt."""
    path = _session_path(session_id)
    try:
        with open(path) as f:
            data = json.load(f)
        state = GameState.from_dict(data, session_id)
        return state
    except FileNotFoundError:
        return None
    except Exception as exc:
        logger.warning("Failed to load session %s: %s", session_id, exc)
        return None


def _delete_session_file(session_id: str) -> None:
    try:
        os.remove(_session_path(session_id))
    except FileNotFoundError:
        pass
    except Exception as exc:
        logger.warning("Failed to delete session file %s: %s", session_id, exc)


# ---------------------------------------------------------------------------
# In-memory session store
# ---------------------------------------------------------------------------

# session_id → GameState (in-memory cache)
_sessions: Dict[str, GameState] = {}

# session_id → True if state has changed since last flush
_dirty: Set[str] = set()


def get_or_create_session(session_id: str) -> GameState:
    """
    Return the GameState for this session.
    - If in memory and not expired: return it.
    - If in memory but expired: clear and return fresh state.
    - If not in memory: try loading from disk.
      - Loaded + not expired: return it.
      - Loaded + expired: delete file, return fresh state.
      - Not on disk: return fresh state.
    """
    if session_id in _sessions:
        state = _sessions[session_id]
        if not state.is_session_expired():
            return state
        # Expired — wipe and start fresh
        logger.info("Session %s expired (in memory), resetting.", session_id)
        state.clear_state()
        state.touch()
        _dirty.add(session_id)
        return state

    # Not in memory — try disk
    state = _load_session(session_id)
    if state is not None:
        if not state.is_session_expired():
            logger.info("Session %s restored from disk.", session_id)
            _sessions[session_id] = state
            return state
        # Expired on disk — delete file and start fresh
        logger.info("Session %s expired (on disk), resetting.", session_id)
        _delete_session_file(session_id)
        state = GameState()
    else:
        state = GameState()

    state.session_id = session_id
    state.touch()
    _sessions[session_id] = state
    _dirty.add(session_id)
    return state


def mark_dirty(session_id: str) -> None:
    """Mark a session as needing a disk flush."""
    _dirty.add(session_id)


async def flush_loop() -> None:
    """Background task: flush dirty sessions to disk every _FLUSH_INTERVAL seconds."""
    while True:
        await asyncio.sleep(_FLUSH_INTERVAL)
        if not _dirty:
            continue
        to_flush = list(_dirty)
        _dirty.clear()
        for sid in to_flush:
            if sid in _sessions:
                _save_session(sid, _sessions[sid])


# ---------------------------------------------------------------------------
# WebSocket connection manager (per-session)
# ---------------------------------------------------------------------------

class ConnectionManager:
    def __init__(self) -> None:
        # session_id → set of active WebSocket connections
        self._sessions: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, session_id: str) -> None:
        await websocket.accept()
        if session_id not in self._sessions:
            self._sessions[session_id] = set()
        self._sessions[session_id].add(websocket)

    def disconnect(self, websocket: WebSocket, session_id: str) -> None:
        if session_id in self._sessions:
            self._sessions[session_id].discard(websocket)

    async def broadcast_to_session(self, session_id: str, data: str) -> None:
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
