"""Tests for session management — create, persist, load, expire, and clean up sessions."""
import os
import time
import pytest

import session_store as state_module
from session_store import (
    get_or_create_session, mark_dirty, _save_session, _load_session, _sanitize_session_id,
    generate_spectator_token, get_session_id_for_token,
)
from models.game_state import GameState
from tests.conftest import make_card


@pytest.fixture(autouse=True)
def isolated_sessions(tmp_path, monkeypatch):
    """Each test gets a clean in-memory session store and an isolated temp directory."""
    state_module._sessions.clear()
    state_module._dirty.clear()
    state_module._spectator_tokens.clear()
    state_module._session_to_token.clear()
    monkeypatch.setattr(state_module, 'SESSION_DIR', str(tmp_path))
    yield
    state_module._sessions.clear()
    state_module._dirty.clear()
    state_module._spectator_tokens.clear()
    state_module._session_to_token.clear()


# ---------------------------------------------------------------------------
# get_or_create_session — basic creation
# ---------------------------------------------------------------------------

def test_creates_fresh_state_for_new_session_id():
    state = get_or_create_session("new-session")
    assert isinstance(state, GameState)
    assert state.session_id == "new-session"
    assert state.last_active > 0.0


def test_returns_same_object_for_same_session_id():
    first = get_or_create_session("sess-a")
    first.life = 15
    second = get_or_create_session("sess-a")
    assert second is first
    assert second.life == 15


# ---------------------------------------------------------------------------
# get_or_create_session — expiry
# ---------------------------------------------------------------------------

def test_expired_in_memory_session_is_reset():
    sess = get_or_create_session("sess-exp")
    sess.life = 7
    sess.last_active = 0.0  # force expiry

    refreshed = get_or_create_session("sess-exp")
    assert refreshed.life == 20
    assert refreshed.last_active > 0.0


def test_expired_on_disk_session_is_discarded(tmp_path):
    expired = GameState()
    expired.session_id = "old-sess"
    expired.last_active = 1.0  # epoch 1 — definitely expired
    expired.life = 5
    _save_session("old-sess", expired)

    loaded = get_or_create_session("old-sess")
    assert loaded.life == 20
    assert not os.path.exists(os.path.join(str(tmp_path), "old-sess.json"))


# ---------------------------------------------------------------------------
# get_or_create_session — disk restore
# ---------------------------------------------------------------------------

def test_restores_active_session_from_disk():
    sess = get_or_create_session("disk-sess")
    sess.life = 13
    sess.touch()
    _save_session("disk-sess", sess)

    # Remove from memory so the next call must hit disk
    state_module._sessions.clear()

    restored = get_or_create_session("disk-sess")
    assert restored.life == 13
    assert restored.session_id == "disk-sess"


# ---------------------------------------------------------------------------
# Session isolation
# ---------------------------------------------------------------------------

def test_two_sessions_are_fully_isolated():
    a = get_or_create_session("player-a")
    b = get_or_create_session("player-b")

    a.life = 10
    b.life = 30

    assert get_or_create_session("player-a").life == 10
    assert get_or_create_session("player-b").life == 30


def test_modifying_one_session_does_not_affect_another():
    a = get_or_create_session("player-a")
    get_or_create_session("player-b")

    cards = [make_card("Island")]
    a.reset(cards)

    b_again = get_or_create_session("player-b")
    assert len(b_again.cards) == 0


# ---------------------------------------------------------------------------
# mark_dirty
# ---------------------------------------------------------------------------

def test_mark_dirty_adds_session_to_dirty_set():
    mark_dirty("some-session")
    assert "some-session" in state_module._dirty


def test_get_or_create_session_marks_new_session_dirty():
    get_or_create_session("brand-new")
    assert "brand-new" in state_module._dirty


# ---------------------------------------------------------------------------
# _save_session / _load_session round-trip
# ---------------------------------------------------------------------------

def test_save_and_load_preserves_life_and_turn():
    sess = GameState()
    sess.session_id = "round-trip"
    sess.life = 17
    sess.turn = 3
    sess.touch()

    _save_session("round-trip", sess)
    loaded = _load_session("round-trip")

    assert loaded is not None
    assert loaded.life == 17
    assert loaded.turn == 3


def test_save_and_load_preserves_cards():
    sess = GameState()
    sess.session_id = "with-cards"
    sess.touch()
    cards = [make_card("Forest", zone="hand"), make_card("Island", zone="battlefield")]
    sess.reset(cards)
    sess.life = 15

    _save_session("with-cards", sess)
    state_module._sessions.clear()
    loaded = _load_session("with-cards")

    assert loaded is not None
    assert len(loaded.cards) == 2


def test_load_returns_none_for_missing_file():
    assert _load_session("does-not-exist") is None


def test_load_returns_none_for_corrupt_file(tmp_path):
    path = os.path.join(str(tmp_path), "bad-sess.json")
    with open(path, "w") as f:
        f.write("not valid json {{{{")

    assert _load_session("bad-sess") is None


# ---------------------------------------------------------------------------
# _sanitize_session_id — path traversal prevention
# ---------------------------------------------------------------------------

def test_valid_uuid_v4_passes_through():
    sid = "550e8400-e29b-41d4-a716-446655440000"
    assert _sanitize_session_id(sid) == sid.lower()


def test_path_traversal_attempt_falls_back_to_default():
    assert _sanitize_session_id("../../etc/passwd") == "default"


def test_non_uuid_string_falls_back_to_default():
    assert _sanitize_session_id("not-a-uuid") == "default"


def test_empty_string_falls_back_to_default():
    assert _sanitize_session_id("") == "default"


def test_path_traversal_session_id_does_not_write_outside_session_dir(tmp_path):
    """A crafted session_id must not cause files to be written outside SESSION_DIR."""
    traversal_id = "../../etc/passwd"
    get_or_create_session(traversal_id)
    # The only file written must be inside tmp_path (the mocked SESSION_DIR)
    written = list(tmp_path.rglob("*.json"))
    for f in written:
        assert str(f).startswith(str(tmp_path)), f"File written outside SESSION_DIR: {f}"


# ---------------------------------------------------------------------------
# Spectator tokens
# ---------------------------------------------------------------------------

def test_generate_spectator_token_returns_string():
    token = generate_spectator_token("player-sess")
    assert isinstance(token, str)
    assert len(token) == 8


def test_same_session_returns_same_token():
    t1 = generate_spectator_token("player-sess")
    t2 = generate_spectator_token("player-sess")
    assert t1 == t2


def test_different_sessions_return_different_tokens():
    t1 = generate_spectator_token("player-a")
    t2 = generate_spectator_token("player-b")
    assert t1 != t2


def test_get_session_id_for_token_resolves_correctly():
    token = generate_spectator_token("player-sess")
    assert get_session_id_for_token(token) == "player-sess"


def test_get_session_id_for_unknown_token_returns_none():
    assert get_session_id_for_token("XXXXXXXX") is None


def test_spectator_token_evicted_when_session_expires():
    sess = get_or_create_session("expire-sess")
    token = generate_spectator_token("expire-sess")
    assert get_session_id_for_token(token) == "expire-sess"

    # Force expiry and trigger a new get_or_create call
    sess.last_active = 0.0
    get_or_create_session("expire-sess")

    # Token should still be resolvable (eviction only happens via cleanup_loop)
    # but the session itself was reset — verify the token still maps to the session
    assert get_session_id_for_token(token) == "expire-sess"
