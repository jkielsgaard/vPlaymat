"""Shared pytest fixtures — card/state helpers and Scryfall mocking."""
from unittest.mock import AsyncMock, patch
import pytest
import respx
import httpx

from models.card import Card
from models.game_state import GameState
import services.scryfall as scryfall_service


# ---------------------------------------------------------------------------
# Card / state helpers
# ---------------------------------------------------------------------------

def make_card(
    name: str = "Lightning Bolt",
    zone: str = "library",
    **kwargs,
) -> Card:
    return Card(
        name=name,
        image_uri=f"https://cards.scryfall.io/normal/{name.lower().replace(' ', '-')}.jpg",
        zone=zone,
        **kwargs,
    )


# ---------------------------------------------------------------------------
# State fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def fresh_state() -> GameState:
    return GameState()


@pytest.fixture
def state_with_deck() -> GameState:
    state = GameState()
    cards = [make_card(f"Card {i}", zone="library") for i in range(5)]
    state.reset(cards)
    return state


# ---------------------------------------------------------------------------
# Scryfall mocking
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def reset_scryfall():
    """Clear cache, reset client, and suppress asyncio.sleep before/after every test."""
    scryfall_service.clear_cache()
    scryfall_service.set_client(None)
    with patch("services.scryfall.asyncio.sleep", new_callable=AsyncMock):
        yield
    scryfall_service.clear_cache()
    scryfall_service.set_client(None)


@pytest.fixture
def mock_scryfall():
    """Active respx mock router for https://api.scryfall.com."""
    with respx.mock(base_url="https://api.scryfall.com", assert_all_called=False) as mock:
        yield mock
