"""FastAPI dependency functions shared across routers."""
from fastapi import HTTPException, Query

from session_store import _spectator_tokens


def forbid_spectator_token(spectator_token: str = Query(default="")) -> None:
    """Reject write requests that carry a spectator token — spectators are read-only."""
    if spectator_token and spectator_token in _spectator_tokens:
        raise HTTPException(
            status_code=403,
            detail="Spectator tokens are read-only and cannot be used for write operations",
        )
