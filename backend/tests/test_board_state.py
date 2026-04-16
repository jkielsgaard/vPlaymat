"""Tests for game board logic — draw, move, tap, counters, and game modes."""
import random
import pytest

from models.card import Card
from models.game_state import GameState
from exceptions import EmptyLibraryError, CardNotFoundError
from tests.conftest import make_card


# ---------------------------------------------------------------------------
# Initial state
# ---------------------------------------------------------------------------

def test_initial_state(fresh_state):
    assert fresh_state.life == 20
    assert fresh_state.cards == {}
    assert fresh_state.library_order == []
    assert fresh_state.commander_damage == {}
    assert fresh_state.turn == 1


def test_reset_loads_cards_into_library(fresh_state):
    cards = [make_card(f"Card {i}") for i in range(3)]
    fresh_state.reset(cards)
    assert len(fresh_state.cards) == 3
    assert len(fresh_state.library_order) == 3
    assert all(c.zone == "library" for c in fresh_state.cards.values())


def test_reset_restores_life_to_20():
    state = GameState()
    state.adjust_life(-5)
    state.reset([make_card()])
    assert state.life == 20


# ---------------------------------------------------------------------------
# Draw
# ---------------------------------------------------------------------------

def test_draw_moves_card_to_hand(state_with_deck):
    top_id = state_with_deck.library_order[0]
    drawn = state_with_deck.draw(1)
    assert len(drawn) == 1
    assert drawn[0].id == top_id
    assert drawn[0].zone == "hand"
    assert top_id not in state_with_deck.library_order


def test_draw_multiple(state_with_deck):
    drawn = state_with_deck.draw(3)
    assert len(drawn) == 3
    assert all(c.zone == "hand" for c in drawn)
    assert len(state_with_deck.library_order) == 2


def test_draw_does_not_exceed_library_size(state_with_deck):
    """Drawing more than library size draws all remaining cards."""
    drawn = state_with_deck.draw(100)
    assert len(drawn) == 5
    assert state_with_deck.library_order == []


def test_draw_from_empty_library_raises(fresh_state):
    with pytest.raises(EmptyLibraryError):
        fresh_state.draw(1)


def test_draw_preserves_order(state_with_deck):
    expected_ids = state_with_deck.library_order[:3]
    drawn = state_with_deck.draw(3)
    assert [c.id for c in drawn] == expected_ids


# ---------------------------------------------------------------------------
# Shuffle
# ---------------------------------------------------------------------------

def test_shuffle_preserves_count(state_with_deck):
    before = len(state_with_deck.library_order)
    state_with_deck.shuffle()
    assert len(state_with_deck.library_order) == before


def test_shuffle_changes_order(state_with_deck):
    original_order = list(state_with_deck.library_order)
    # Run several shuffles; at least one should differ (astronomically unlikely to match 5! orderings all equal)
    different = False
    for _ in range(20):
        state_with_deck.library_order = list(original_order)
        state_with_deck.shuffle()
        if state_with_deck.library_order != original_order:
            different = True
            break
    assert different


def test_shuffle_contains_same_ids(state_with_deck):
    original_ids = set(state_with_deck.library_order)
    state_with_deck.shuffle()
    assert set(state_with_deck.library_order) == original_ids


# ---------------------------------------------------------------------------
# Tap / untap
# ---------------------------------------------------------------------------

def test_tap_card(state_with_deck):
    card_id = list(state_with_deck.cards.keys())[0]
    state_with_deck.cards[card_id].zone = "battlefield"
    state_with_deck.tap_card(card_id)
    assert state_with_deck.cards[card_id].tapped is True


def test_untap_card(state_with_deck):
    card_id = list(state_with_deck.cards.keys())[0]
    state_with_deck.cards[card_id].zone = "battlefield"
    state_with_deck.cards[card_id].tapped = True
    state_with_deck.tap_card(card_id)
    assert state_with_deck.cards[card_id].tapped is False


def test_tap_nonexistent_card_raises(fresh_state):
    with pytest.raises(CardNotFoundError):
        fresh_state.tap_card("nonexistent-id")


# ---------------------------------------------------------------------------
# Move card
# ---------------------------------------------------------------------------

def test_play_card_moves_to_battlefield(state_with_deck):
    state_with_deck.draw(1)
    hand_card = next(c for c in state_with_deck.cards.values() if c.zone == "hand")
    state_with_deck.move_card(hand_card.id, "battlefield", x=0.4, y=0.5)
    assert state_with_deck.cards[hand_card.id].zone == "battlefield"
    assert state_with_deck.cards[hand_card.id].x == 0.4
    assert state_with_deck.cards[hand_card.id].y == 0.5


def test_move_battlefield_to_graveyard(state_with_deck):
    card_id = list(state_with_deck.cards.keys())[0]
    state_with_deck.cards[card_id].zone = "battlefield"
    state_with_deck.library_order.remove(card_id)
    state_with_deck.move_card(card_id, "graveyard")
    assert state_with_deck.cards[card_id].zone == "graveyard"


def test_move_graveyard_to_exile(state_with_deck):
    card_id = list(state_with_deck.cards.keys())[0]
    state_with_deck.cards[card_id].zone = "graveyard"
    state_with_deck.library_order.remove(card_id)
    state_with_deck.move_card(card_id, "exile")
    assert state_with_deck.cards[card_id].zone == "exile"


def test_move_to_non_battlefield_clears_tapped(state_with_deck):
    card_id = list(state_with_deck.cards.keys())[0]
    state_with_deck.cards[card_id].zone = "battlefield"
    state_with_deck.cards[card_id].tapped = True
    state_with_deck.library_order.remove(card_id)
    state_with_deck.move_card(card_id, "graveyard")
    assert state_with_deck.cards[card_id].tapped is False


def test_move_to_library_appends_to_library_order(state_with_deck):
    card_id = list(state_with_deck.cards.keys())[0]
    state_with_deck.cards[card_id].zone = "graveyard"
    state_with_deck.library_order.remove(card_id)
    state_with_deck.move_card(card_id, "library")
    assert card_id in state_with_deck.library_order


def test_move_nonexistent_card_raises(fresh_state):
    with pytest.raises(CardNotFoundError):
        fresh_state.move_card("nonexistent-id", "graveyard")


# ---------------------------------------------------------------------------
# Untap all
# ---------------------------------------------------------------------------

def test_untap_all_untaps_battlefield_cards(state_with_deck):
    for card in state_with_deck.cards.values():
        card.zone = "battlefield"
        card.tapped = True
    state_with_deck.library_order.clear()
    state_with_deck.untap_all()
    assert all(not c.tapped for c in state_with_deck.cards.values())


def test_untap_all_leaves_hand_cards_unchanged(state_with_deck):
    state_with_deck.draw(2)
    hand_cards = [c for c in state_with_deck.cards.values() if c.zone == "hand"]
    # tapped field on hand cards is irrelevant but should not be touched
    for c in hand_cards:
        c.tapped = True  # manually set to verify untap_all ignores them
    state_with_deck.untap_all()
    assert all(c.tapped for c in hand_cards)


# ---------------------------------------------------------------------------
# Life total
# ---------------------------------------------------------------------------

def test_adjust_life_positive(fresh_state):
    result = fresh_state.adjust_life(5)
    assert result == 25
    assert fresh_state.life == 25


def test_adjust_life_negative(fresh_state):
    result = fresh_state.adjust_life(-7)
    assert result == 13
    assert fresh_state.life == 13


def test_adjust_life_to_zero(fresh_state):
    result = fresh_state.adjust_life(-20)
    assert result == 0


# ---------------------------------------------------------------------------
# Counters
# ---------------------------------------------------------------------------

def test_add_counter(state_with_deck):
    card_id = list(state_with_deck.cards.keys())[0]
    state_with_deck.add_counter(card_id, "p1p1", 2)
    assert state_with_deck.cards[card_id].counters["p1p1"] == 2


def test_add_counter_accumulates(state_with_deck):
    card_id = list(state_with_deck.cards.keys())[0]
    state_with_deck.add_counter(card_id, "p1p1", 2)
    state_with_deck.add_counter(card_id, "p1p1", 1)
    assert state_with_deck.cards[card_id].counters["p1p1"] == 3


def test_remove_counter(state_with_deck):
    card_id = list(state_with_deck.cards.keys())[0]
    state_with_deck.add_counter(card_id, "p1p1", 3)
    state_with_deck.add_counter(card_id, "p1p1", -1)
    assert state_with_deck.cards[card_id].counters["p1p1"] == 2


# ---------------------------------------------------------------------------
# Mulligan
# ---------------------------------------------------------------------------

def test_mulligan_returns_smaller_hand(state_with_deck):
    state_with_deck.draw(7)  # draws all 5 available
    new_hand = state_with_deck.mulligan()
    assert len(new_hand) == 4  # 5 - 1


def test_mulligan_shuffles_hand_back_to_library(state_with_deck):
    state_with_deck.draw(3)
    state_with_deck.mulligan()
    # All cards should be accounted for in library or hand
    library_count = len(state_with_deck.library_order)
    hand_count = sum(1 for c in state_with_deck.cards.values() if c.zone == "hand")
    assert library_count + hand_count == 5


def test_mulligan_with_empty_hand_does_nothing(state_with_deck):
    """Mulligan with no hand draws 0 cards (max(0, 0-1) = 0)."""
    new_hand = state_with_deck.mulligan()
    assert new_hand == []
    assert len(state_with_deck.library_order) == 5


# ---------------------------------------------------------------------------
# Serialisation
# ---------------------------------------------------------------------------

def test_to_dict_contains_expected_keys(state_with_deck):
    d = state_with_deck.to_dict()
    assert {"cards", "library_order", "life", "game_mode", "commander_damage", "turn", "opponent_count", "opponent_names"}.issubset(d.keys())


def test_to_dict_cards_are_dicts(state_with_deck):
    d = state_with_deck.to_dict()
    for card_dict in d["cards"].values():
        assert isinstance(card_dict, dict)
        assert "id" in card_dict
        assert "name" in card_dict
        assert "image_uri" in card_dict
        assert "zone" in card_dict


# ---------------------------------------------------------------------------
# Game mode
# ---------------------------------------------------------------------------

def test_default_game_mode_is_normal(fresh_state):
    assert fresh_state.game_mode == "normal"
    assert fresh_state.starting_life() == 20


def test_commander_mode_sets_life_40(fresh_state):
    fresh_state.set_mode("commander")
    assert fresh_state.game_mode == "commander"
    assert fresh_state.life == 40


def test_normal_mode_sets_life_20(fresh_state):
    fresh_state.set_mode("commander")
    fresh_state.set_mode("normal")
    assert fresh_state.life == 20


def test_set_mode_clears_commander_damage(fresh_state):
    fresh_state.set_mode("commander")
    fresh_state.add_commander_damage("Opponent A", 10)
    fresh_state.set_mode("normal")
    assert fresh_state.commander_damage == {}


def test_set_invalid_mode_raises(fresh_state):
    with pytest.raises(ValueError):
        fresh_state.set_mode("vintage")


def test_reset_preserves_game_mode(fresh_state):
    fresh_state.set_mode("commander")
    fresh_state.reset([make_card()])
    assert fresh_state.game_mode == "commander"


def test_reset_in_commander_mode_sets_life_40(fresh_state):
    fresh_state.set_mode("commander")
    fresh_state.reset([make_card()])
    assert fresh_state.life == 40


def test_reset_in_normal_mode_sets_life_20(fresh_state):
    fresh_state.reset([make_card()])
    assert fresh_state.life == 20


# ---------------------------------------------------------------------------
# Commander damage
# ---------------------------------------------------------------------------

def test_add_commander_damage(fresh_state):
    total = fresh_state.add_commander_damage("Atraxa", 5)
    assert total == 5
    assert fresh_state.commander_damage["Atraxa"] == 5


def test_commander_damage_accumulates(fresh_state):
    fresh_state.add_commander_damage("Atraxa", 10)
    total = fresh_state.add_commander_damage("Atraxa", 8)
    assert total == 18


def test_commander_damage_tracked_per_source(fresh_state):
    fresh_state.add_commander_damage("Atraxa", 10)
    fresh_state.add_commander_damage("Zur", 15)
    assert fresh_state.commander_damage["Atraxa"] == 10
    assert fresh_state.commander_damage["Zur"] == 15


def test_check_commander_loss_returns_none_below_21(fresh_state):
    fresh_state.add_commander_damage("Atraxa", 20)
    assert fresh_state.check_commander_loss() is None


def test_check_commander_loss_triggers_at_21(fresh_state):
    fresh_state.add_commander_damage("Atraxa", 21)
    assert fresh_state.check_commander_loss() == "Atraxa"


def test_check_commander_loss_triggers_above_21(fresh_state):
    fresh_state.add_commander_damage("Zur", 25)
    assert fresh_state.check_commander_loss() == "Zur"


def test_check_commander_loss_only_triggers_for_single_source(fresh_state):
    # 10 + 10 from two different commanders does NOT trigger a loss
    fresh_state.add_commander_damage("Atraxa", 10)
    fresh_state.add_commander_damage("Zur", 10)
    assert fresh_state.check_commander_loss() is None


# ---------------------------------------------------------------------------
# new_game
# ---------------------------------------------------------------------------

def test_new_game_returns_all_cards_to_library():
    state = GameState()
    cards = [make_card(f"Card {i}") for i in range(6)]
    state.reset(cards)
    # scatter cards to different zones
    ids = list(state.cards.keys())
    state.cards[ids[0]].zone = "hand"
    state.cards[ids[1]].zone = "battlefield"
    state.cards[ids[2]].zone = "graveyard"
    state.cards[ids[3]].zone = "exile"
    state.library_order = [ids[4], ids[5]]

    state.new_game()

    assert all(c.zone == "library" for c in state.cards.values())
    assert len(state.library_order) == 6


def test_new_game_shuffles_library():
    state = GameState()
    cards = [make_card(f"Card {i}") for i in range(20)]
    state.reset(cards)
    original = list(c.id for c in cards)

    different = False
    for _ in range(10):
        state.new_game()
        if state.library_order != original:
            different = True
            break
    assert different


def test_new_game_resets_life_and_turn():
    state = GameState()
    cards = [make_card()]
    state.reset(cards)
    state.adjust_life(-10)
    state.turn = 5

    state.new_game()

    assert state.life == 20
    assert state.turn == 1


def test_new_game_preserves_game_mode():
    state = GameState()
    state.set_mode("commander")
    cards = [make_card()]
    state.reset(cards)

    state.new_game()

    assert state.game_mode == "commander"
    assert state.life == 40


def test_new_game_clears_commander_damage():
    state = GameState()
    state.add_commander_damage("Atraxa", 15)
    state.new_game()
    assert state.commander_damage == {}


# ---------------------------------------------------------------------------
# Command zone
# ---------------------------------------------------------------------------

def test_move_card_to_command_zone():
    state = GameState()
    cards = [make_card()]
    state.reset(cards)
    card_id = list(state.cards.keys())[0]

    state.move_card(card_id, "command")

    assert state.cards[card_id].zone == "command"


def test_command_zone_card_not_in_library_order():
    state = GameState()
    cards = [make_card()]
    state.reset(cards)
    card_id = list(state.cards.keys())[0]

    state.move_card(card_id, "command")

    assert card_id not in state.library_order


# ---------------------------------------------------------------------------
# Opponent count
# ---------------------------------------------------------------------------

def test_opponent_count_defaults_to_3():
    state = GameState()
    assert state.opponent_count == 3


def test_set_mode_preserves_opponent_count():
    state = GameState()
    state.opponent_count = 2
    state.set_mode("commander")
    assert state.opponent_count == 2


def test_to_dict_contains_opponent_count():
    state = GameState()
    d = state.to_dict()
    assert "opponent_count" in d


# ---------------------------------------------------------------------------
# Battlefield coordinate clamping
# ---------------------------------------------------------------------------

def test_move_to_battlefield_clamps_negative_coords():
    state = GameState()
    cards = [make_card()]
    state.reset(cards)
    card_id = list(state.cards.keys())[0]

    state.move_card(card_id, "battlefield", x=-0.5, y=-1.0)

    assert state.cards[card_id].x == 0.0
    assert state.cards[card_id].y == 0.0


def test_move_to_battlefield_clamps_over_one_coords():
    state = GameState()
    cards = [make_card()]
    state.reset(cards)
    card_id = list(state.cards.keys())[0]

    state.move_card(card_id, "battlefield", x=1.5, y=2.0)

    assert state.cards[card_id].x == 1.0
    assert state.cards[card_id].y == 1.0


def test_move_to_battlefield_preserves_valid_coords():
    state = GameState()
    cards = [make_card()]
    state.reset(cards)
    card_id = list(state.cards.keys())[0]

    state.move_card(card_id, "battlefield", x=0.4, y=0.6)

    assert state.cards[card_id].x == 0.4
    assert state.cards[card_id].y == 0.6


# ---------------------------------------------------------------------------
# Phase 1.8 — is_commander flag
# ---------------------------------------------------------------------------

def test_is_commander_defaults_to_false():
    card = make_card()
    assert card.is_commander is False


def test_is_commander_flag_set_on_card():
    card = make_card(is_commander=True)
    assert card.is_commander is True


def test_new_game_preserves_is_commander():
    state = GameState()
    state.set_mode("commander")
    commander = make_card("Atraxa", is_commander=True)
    other = make_card("Forest")
    state.reset([commander, other])
    # Put commander in command zone (as import does)
    state.cards[commander.id].zone = "command"
    state.library_order.remove(commander.id)

    state.new_game()

    assert state.cards[commander.id].is_commander is True
    assert state.cards[commander.id].zone == "command"
    assert commander.id not in state.library_order


def test_new_game_commander_not_in_library():
    state = GameState()
    state.set_mode("commander")
    commander = make_card("Atraxa", is_commander=True)
    other = make_card("Forest")
    state.reset([commander, other])
    state.cards[commander.id].zone = "command"
    state.library_order.remove(commander.id)

    state.new_game()

    assert commander.id not in state.library_order
    assert len(state.library_order) == 1  # only the Forest


# ---------------------------------------------------------------------------
# Phase 1.8 — commander damage reduces life
# ---------------------------------------------------------------------------

def test_commander_damage_reduces_life():
    state = GameState()
    state.set_mode("commander")  # 40 life
    state.add_commander_damage("Alice", 3)
    assert state.life == 37


def test_commander_damage_decrement_restores_life():
    state = GameState()
    state.set_mode("commander")
    state.add_commander_damage("Alice", 3)
    state.add_commander_damage("Alice", -1)
    assert state.life == 38


def test_commander_damage_multiple_sources_reduces_life():
    state = GameState()
    state.set_mode("commander")
    state.add_commander_damage("Alice", 5)
    state.add_commander_damage("Bob", 3)
    assert state.life == 32


# ---------------------------------------------------------------------------
# Phase 1.8 — opponent names
# ---------------------------------------------------------------------------

def test_opponent_names_defaults_empty():
    state = GameState()
    assert state.opponent_names == []


def test_to_dict_contains_opponent_names():
    state = GameState()
    state.opponent_names = ["Alice", "Bob"]
    d = state.to_dict()
    assert d["opponent_names"] == ["Alice", "Bob"]


def test_new_game_preserves_opponent_names():
    state = GameState()
    state.opponent_names = ["Alice", "Bob", "Charlie"]
    cards = [make_card()]
    state.reset(cards)
    state.new_game()
    assert state.opponent_names == ["Alice", "Bob", "Charlie"]


# ---------------------------------------------------------------------------
# Phase 1.8 — next_turn
# ---------------------------------------------------------------------------

def test_next_turn_increments_turn_counter(state_with_deck):
    assert state_with_deck.turn == 1
    state_with_deck.next_turn()
    assert state_with_deck.turn == 2


def test_next_turn_untaps_all_battlefield_cards(state_with_deck):
    # Place a tapped card on battlefield
    card_id = list(state_with_deck.cards.keys())[0]
    state_with_deck.move_card(card_id, "battlefield")
    state_with_deck.tap_card(card_id)
    assert state_with_deck.cards[card_id].tapped is True

    state_with_deck.next_turn()

    assert state_with_deck.cards[card_id].tapped is False


def test_next_turn_draws_one_card(state_with_deck):
    hand_before = sum(1 for c in state_with_deck.cards.values() if c.zone == "hand")
    state_with_deck.next_turn()
    hand_after = sum(1 for c in state_with_deck.cards.values() if c.zone == "hand")
    assert hand_after == hand_before + 1


def test_next_turn_with_empty_library_does_not_crash():
    state = GameState()
    # No cards — library is empty
    state.next_turn()
    assert state.turn == 2


def test_next_turn_returns_drawn_card(state_with_deck):
    drawn = state_with_deck.next_turn()
    assert drawn is not None
    assert drawn.zone == "hand"


def test_next_turn_returns_none_when_library_empty():
    state = GameState()
    result = state.next_turn()
    assert result is None


# ---------------------------------------------------------------------------
# Graveyard ordering (newest-on-top)
# ---------------------------------------------------------------------------

def test_graveyard_newest_card_is_at_index_zero():
    state = GameState()
    cards = [make_card(f"Card {i}") for i in range(3)]
    state.reset(cards)
    ids = list(state.cards.keys())
    for cid in ids:
        state.cards[cid].zone = "battlefield"
    state.library_order.clear()

    state.move_card(ids[0], "graveyard")
    state.move_card(ids[1], "graveyard")
    state.move_card(ids[2], "graveyard")

    # ids[2] was moved last, so it should be at the front
    assert state.graveyard_order[0] == ids[2]
    assert state.graveyard_order[-1] == ids[0]


def test_graveyard_order_length_matches_graveyard_cards():
    state = GameState()
    cards = [make_card(f"Card {i}") for i in range(4)]
    state.reset(cards)
    ids = list(state.cards.keys())
    for cid in ids:
        state.cards[cid].zone = "battlefield"
    state.library_order.clear()

    for cid in ids:
        state.move_card(cid, "graveyard")

    assert len(state.graveyard_order) == 4


# ---------------------------------------------------------------------------
# move_card — to_top
# ---------------------------------------------------------------------------

def test_move_to_library_top_prepends():
    state = GameState()
    cards = [make_card(f"Card {i}") for i in range(3)]
    state.reset(cards)
    card_id = state.library_order[-1]  # last card
    state.cards[card_id].zone = "graveyard"
    state.library_order.remove(card_id)

    state.move_card(card_id, "library", to_top=True)

    assert state.library_order[0] == card_id


def test_move_to_library_without_to_top_appends():
    state = GameState()
    cards = [make_card(f"Card {i}") for i in range(3)]
    state.reset(cards)
    card_id = state.library_order[-1]
    state.cards[card_id].zone = "graveyard"
    state.library_order.remove(card_id)

    state.move_card(card_id, "library", to_top=False)

    assert state.library_order[-1] == card_id


# ---------------------------------------------------------------------------
# Poison counters
# ---------------------------------------------------------------------------

def test_adjust_poison_increments(fresh_state):
    result = fresh_state.adjust_poison(3)
    assert result == 3
    assert fresh_state.poison_counters == 3


def test_adjust_poison_decrements(fresh_state):
    fresh_state.adjust_poison(5)
    result = fresh_state.adjust_poison(-2)
    assert result == 3


def test_adjust_poison_clamps_at_zero(fresh_state):
    result = fresh_state.adjust_poison(-10)
    assert result == 0
    assert fresh_state.poison_counters == 0


# ---------------------------------------------------------------------------
# Commander returns counter
# ---------------------------------------------------------------------------

def test_commander_returns_increments_when_commander_goes_to_command_zone():
    state = GameState()
    state.set_mode("commander")
    commander = make_card("Atraxa", is_commander=True, zone="battlefield")
    state.cards[commander.id] = commander

    state.move_card(commander.id, "command")

    assert state.commander_returns == 1


def test_commander_returns_does_not_increment_for_non_commander():
    state = GameState()
    card = make_card("Forest", zone="battlefield")
    state.cards[card.id] = card

    state.move_card(card.id, "command")

    assert state.commander_returns == 0


def test_commander_returns_does_not_increment_from_library():
    """Commander moving from library to command zone (initial placement) does not count as a return."""
    state = GameState()
    state.set_mode("commander")
    commander = make_card("Atraxa", is_commander=True, zone="library")
    state.cards[commander.id] = commander
    state.library_order.append(commander.id)

    state.move_card(commander.id, "command")

    assert state.commander_returns == 0


def test_commander_returns_accumulates_over_multiple_returns():
    state = GameState()
    state.set_mode("commander")
    commander = make_card("Atraxa", is_commander=True)
    state.cards[commander.id] = commander

    commander.zone = "battlefield"
    state.move_card(commander.id, "command")
    commander.zone = "graveyard"
    state.move_card(commander.id, "command")

    assert state.commander_returns == 2


# ---------------------------------------------------------------------------
# Token lifecycle
# ---------------------------------------------------------------------------

def test_token_is_removed_when_moved_off_battlefield():
    state = GameState()
    token = state.create_token("Goblin", "https://example.com/goblin.jpg", x=0.5, y=0.5)

    state.move_card(token.id, "graveyard")

    assert token.id not in state.cards


def test_non_token_is_not_removed_when_moved_to_graveyard():
    state = GameState()
    card = make_card("Forest", zone="battlefield")
    state.cards[card.id] = card

    state.move_card(card.id, "graveyard")

    assert card.id in state.cards


def test_token_removed_from_graveyard_order_when_deleted():
    state = GameState()
    token = state.create_token("Goblin", "https://example.com/goblin.jpg")

    state.move_card(token.id, "graveyard")

    assert token.id not in state.graveyard_order


# ---------------------------------------------------------------------------
# Face-down card reveal on zone change
# ---------------------------------------------------------------------------

def test_face_down_card_is_revealed_when_moved_to_graveyard():
    state = GameState()
    card = make_card("Morphling", zone="battlefield", face_down=True)
    state.cards[card.id] = card

    state.move_card(card.id, "graveyard")

    assert state.cards[card.id].face_down is False


def test_face_down_card_is_revealed_when_moved_to_exile():
    state = GameState()
    card = make_card("Morphling", zone="battlefield", face_down=True)
    state.cards[card.id] = card

    state.move_card(card.id, "exile")

    assert state.cards[card.id].face_down is False


def test_face_down_card_stays_face_down_when_moved_to_hand():
    state = GameState()
    card = make_card("Morphling", zone="battlefield", face_down=True)
    state.cards[card.id] = card

    state.move_card(card.id, "hand")

    assert state.cards[card.id].face_down is True


# ---------------------------------------------------------------------------
# flip_card (Morph / Manifest)
# ---------------------------------------------------------------------------

def test_flip_card_sets_face_down_to_true():
    state = GameState()
    card = make_card("Morphling", zone="battlefield")
    state.cards[card.id] = card

    state.flip_card(card.id)

    assert state.cards[card.id].face_down is True


def test_flip_card_toggles_back_to_face_up():
    state = GameState()
    card = make_card("Morphling", zone="battlefield", face_down=True)
    state.cards[card.id] = card

    state.flip_card(card.id)

    assert state.cards[card.id].face_down is False


def test_flip_nonexistent_card_raises():
    state = GameState()
    with pytest.raises(CardNotFoundError):
        state.flip_card("nonexistent-id")


# ---------------------------------------------------------------------------
# transform_card (DFC — double-faced cards)
# ---------------------------------------------------------------------------

def test_transform_card_sets_transformed_true():
    state = GameState()
    card = make_card("Delver of Secrets", zone="battlefield", back_image_uri="https://example.com/back.jpg")
    state.cards[card.id] = card

    state.transform_card(card.id)

    assert state.cards[card.id].transformed is True


def test_transform_card_toggles_back_to_front():
    state = GameState()
    card = make_card("Delver of Secrets", zone="battlefield",
                     back_image_uri="https://example.com/back.jpg", transformed=True)
    state.cards[card.id] = card

    state.transform_card(card.id)

    assert state.cards[card.id].transformed is False


def test_transform_single_faced_card_raises():
    state = GameState()
    card = make_card("Forest", zone="battlefield")  # no back_image_uri
    state.cards[card.id] = card

    with pytest.raises(ValueError):
        state.transform_card(card.id)


# ---------------------------------------------------------------------------
# scry
# ---------------------------------------------------------------------------

def test_scry_keeps_top_cards_at_front():
    state = GameState()
    cards = [make_card(f"Card {i}") for i in range(5)]
    state.reset(cards)
    top_id = state.library_order[0]
    second_id = state.library_order[1]

    state.scry(keep_top=[top_id, second_id], send_bottom=[])

    assert state.library_order[0] == top_id
    assert state.library_order[1] == second_id


def test_scry_sends_bottom_cards_to_end():
    state = GameState()
    cards = [make_card(f"Card {i}") for i in range(5)]
    state.reset(cards)
    bottom_id = state.library_order[0]

    state.scry(keep_top=[], send_bottom=[bottom_id])

    assert state.library_order[-1] == bottom_id


def test_scry_preserves_total_card_count():
    state = GameState()
    cards = [make_card(f"Card {i}") for i in range(5)]
    state.reset(cards)
    top_id = state.library_order[0]
    bottom_id = state.library_order[1]

    state.scry(keep_top=[top_id], send_bottom=[bottom_id])

    assert len(state.library_order) == 5


# ---------------------------------------------------------------------------
# remove_all_counters
# ---------------------------------------------------------------------------

def test_remove_all_counters_clears_counter_dict():
    state = GameState()
    card = make_card("Forest", zone="battlefield")
    card.counters = {"+1/+1": 3, "charge": 1}
    state.cards[card.id] = card

    state.remove_all_counters(card.id)

    assert state.cards[card.id].counters == {}


def test_remove_all_counters_on_card_with_no_counters_is_safe():
    state = GameState()
    card = make_card("Forest", zone="battlefield")
    state.cards[card.id] = card

    state.remove_all_counters(card.id)

    assert state.cards[card.id].counters == {}


# ---------------------------------------------------------------------------
# create_token
# ---------------------------------------------------------------------------

def test_create_token_adds_card_to_battlefield():
    state = GameState()
    token = state.create_token("Goblin", "https://example.com/goblin.jpg", x=0.3, y=0.4)

    assert token.id in state.cards
    assert state.cards[token.id].zone == "battlefield"
    assert state.cards[token.id].is_token is True


def test_create_token_sets_position():
    state = GameState()
    token = state.create_token("Goblin", "https://example.com/goblin.jpg", x=0.3, y=0.4)

    assert state.cards[token.id].x == pytest.approx(0.3)
    assert state.cards[token.id].y == pytest.approx(0.4)


def test_create_token_clamps_position():
    state = GameState()
    token = state.create_token("Goblin", "https://example.com/goblin.jpg", x=2.0, y=-1.0)

    assert state.cards[token.id].x == 1.0
    assert state.cards[token.id].y == 0.0


def test_new_game_removes_tokens():
    state = GameState()
    cards = [make_card("Forest")]
    state.reset(cards)
    state.create_token("Goblin", "https://example.com/goblin.jpg")

    state.new_game()

    assert all(not c.is_token for c in state.cards.values())

# ---------------------------------------------------------------------------
# reset_deck — atomic game config + deck reset
# ---------------------------------------------------------------------------

def test_reset_deck_sets_game_mode_and_cards():
    state = GameState()
    cards = [make_card("Island"), make_card("Forest")]
    state.reset_deck(cards, "commander", 2, ["Alice", "Bob"])

    assert state.game_mode == "commander"
    assert len(state.cards) == 2


def test_reset_deck_sets_opponent_fields():
    state = GameState()
    state.reset_deck([make_card("Plains")], "normal", 3, ["X", "Y", "Z"])

    assert state.opponent_count == 3
    assert state.opponent_names == ["X", "Y", "Z"]


def test_reset_deck_resets_life_to_mode_starting_life():
    state = GameState()
    state.reset_deck([make_card("Island")], "commander", 1, [])

    # Commander starting life is 40
    assert state.life == 40


def test_reset_deck_is_atomic_game_mode_visible_in_reset():
    """game_mode must be set before reset() so starting_life() returns the right value."""
    state = GameState()
    state.life = 99  # Simulate previous state
    state.reset_deck([make_card("Island")], "commander", 1, ["Opp"])

    assert state.life == 40  # commander starting life, not the old 99


def test_reset_deck_makes_copy_of_opponent_names():
    """Mutating the original list must not affect the stored names."""
    names = ["Alice", "Bob"]
    state = GameState()
    state.reset_deck([make_card("Island")], "normal", 2, names)

    names.append("Charlie")
    assert state.opponent_names == ["Alice", "Bob"]
