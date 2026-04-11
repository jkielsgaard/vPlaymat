import time
import pytest

from models.game_state import GameState, SESSION_EXPIRY_SECONDS
from tests.conftest import make_card


# ---------------------------------------------------------------------------
# touch / is_session_expired
# ---------------------------------------------------------------------------

def test_touch_updates_last_active():
    state = GameState()
    assert state.last_active == 0.0
    before = time.time()
    state.touch()
    assert state.last_active >= before


def test_is_session_expired_with_zero_timestamp():
    state = GameState()
    assert state.is_session_expired() is True


def test_is_session_expired_with_recent_timestamp():
    state = GameState()
    state.touch()
    assert state.is_session_expired() is False


def test_is_session_expired_with_old_timestamp():
    state = GameState()
    state.last_active = time.time() - SESSION_EXPIRY_SECONDS - 1
    assert state.is_session_expired() is True


# ---------------------------------------------------------------------------
# clear_state
# ---------------------------------------------------------------------------

def test_clear_state_resets_all_game_fields():
    state = GameState()
    cards = [make_card(f"Card {i}") for i in range(3)]
    state.reset(cards)
    state.adjust_life(-10)
    state.turn = 5
    state.poison_counters = 3
    state.commander_returns = 2
    state.game_mode = "commander"
    state.session_id = "keep-me"
    state.last_active = 999.0

    state.clear_state()

    assert state.cards == {}
    assert state.library_order == []
    assert state.graveyard_order == []
    assert state.life == 20
    assert state.game_mode == "normal"
    assert state.turn == 1
    assert state.poison_counters == 0
    assert state.commander_returns == 0


def test_clear_state_does_not_touch_session_id_or_last_active():
    state = GameState()
    state.session_id = "keep-me"
    state.last_active = 999.0

    state.clear_state()

    assert state.session_id == "keep-me"
    assert state.last_active == 999.0


# ---------------------------------------------------------------------------
# to_persist_dict / to_dict
# ---------------------------------------------------------------------------

def test_to_persist_dict_includes_last_active():
    state = GameState()
    state.touch()
    d = state.to_persist_dict()
    assert "last_active" in d
    assert d["last_active"] == state.last_active


def test_to_dict_excludes_last_active():
    state = GameState()
    state.touch()
    d = state.to_dict()
    assert "last_active" not in d


# ---------------------------------------------------------------------------
# from_dict round-trip
# ---------------------------------------------------------------------------

def test_from_dict_round_trip_preserves_fields():
    original = GameState()
    original.game_mode = "commander"
    original.poison_counters = 2
    original.commander_returns = 1
    original.touch()
    cards = [make_card("Forest", zone="hand")]
    original.reset(cards)
    original.life = 35

    data = original.to_persist_dict()
    restored = GameState.from_dict(data, "restored-session")

    assert restored.life == 35
    assert restored.session_id == "restored-session"
    assert restored.last_active == pytest.approx(original.last_active)
    assert len(restored.cards) == 1


def test_from_dict_handles_missing_optional_fields():
    """Old saves without newer fields should deserialise without errors."""
    minimal = {
        "cards": {},
        "library_order": [],
        "life": 20,
        "game_mode": "normal",
        "commander_damage": {},
        "turn": 1,
        "opponent_count": 3,
        "opponent_names": [],
        "poison_counters": 0,
        # Deliberately missing: graveyard_order, commander_returns, last_active
    }
    state = GameState.from_dict(minimal, "compat-session")
    assert state.graveyard_order == []
    assert state.commander_returns == 0
    assert state.last_active == 0.0


def test_from_dict_restores_card_properties():
    data = {
        "cards": {
            "card-1": {
                "name": "Lightning Bolt",
                "image_uri": "https://example.com/bolt.jpg",
                "back_image_uri": "",
                "zone": "battlefield",
                "tapped": True,
                "counters": {"+1/+1": 2},
                "x": 0.3,
                "y": 0.7,
                "is_commander": False,
                "is_token": False,
                "face_down": False,
                "transformed": False,
            }
        },
        "library_order": [],
        "graveyard_order": [],
        "life": 20,
        "game_mode": "normal",
        "commander_damage": {},
        "turn": 1,
        "opponent_count": 3,
        "opponent_names": [],
        "poison_counters": 0,
        "commander_returns": 0,
        "last_active": 123456.0,
    }
    state = GameState.from_dict(data, "card-test")
    card = state.cards["card-1"]

    assert card.name == "Lightning Bolt"
    assert card.tapped is True
    assert card.counters == {"+1/+1": 2}
    assert card.x == pytest.approx(0.3)
    assert card.y == pytest.approx(0.7)
    assert state.last_active == pytest.approx(123456.0)
