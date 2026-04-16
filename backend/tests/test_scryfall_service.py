"""Tests for the Scryfall API service — single lookups, batch imports, and caching."""
import asyncio
import pytest
import httpx
import respx

import services.scryfall as scryfall_service
from exceptions import CardNotFoundError, ScryfallAPIError

# ---------------------------------------------------------------------------
# Canned Scryfall responses
# ---------------------------------------------------------------------------

MOCK_CARD = {
    "name": "Lightning Bolt",
    "image_uris": {
        "normal": "https://cards.scryfall.io/normal/lightning-bolt.jpg",
        "large": "https://cards.scryfall.io/large/lightning-bolt.jpg",
    },
}

MOCK_DFC = {
    "name": "Delver of Secrets",
    "card_faces": [
        {
            "name": "Delver of Secrets",
            "image_uris": {
                "normal": "https://cards.scryfall.io/normal/delver-front.jpg",
            },
        },
        {
            "name": "Insectile Aberration",
            "image_uris": {
                "normal": "https://cards.scryfall.io/normal/delver-back.jpg",
            },
        },
    ],
}


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_fetch_card_returns_image_uri(mock_scryfall):
    mock_scryfall.get("/cards/named").mock(
        return_value=httpx.Response(200, json=MOCK_CARD)
    )
    result = await scryfall_service.get_card("Lightning Bolt")
    assert result["name"] == "Lightning Bolt"
    assert result["image_uri"] == "https://cards.scryfall.io/normal/lightning-bolt.jpg"


@pytest.mark.asyncio
async def test_fetch_dfc_returns_front_face_image(mock_scryfall):
    mock_scryfall.get("/cards/named").mock(
        return_value=httpx.Response(200, json=MOCK_DFC)
    )
    result = await scryfall_service.get_card("Delver of Secrets")
    assert result["image_uri"] == "https://cards.scryfall.io/normal/delver-front.jpg"


@pytest.mark.asyncio
async def test_fetch_card_caches_result(mock_scryfall):
    mock_scryfall.get("/cards/named").mock(
        return_value=httpx.Response(200, json=MOCK_CARD)
    )
    await scryfall_service.get_card("Lightning Bolt")
    await scryfall_service.get_card("Lightning Bolt")
    # Only one real HTTP call despite two awaits
    assert mock_scryfall.calls.call_count == 1


@pytest.mark.asyncio
async def test_fetch_card_not_found_raises(mock_scryfall):
    mock_scryfall.get("/cards/named").mock(
        return_value=httpx.Response(404, json={"object": "error", "status": 404})
    )
    with pytest.raises(CardNotFoundError):
        await scryfall_service.get_card("Definitely Not A Real Card")


@pytest.mark.asyncio
async def test_fetch_card_http_error_raises(mock_scryfall):
    mock_scryfall.get("/cards/named").mock(
        return_value=httpx.Response(500, text="Internal Server Error")
    )
    with pytest.raises(ScryfallAPIError):
        await scryfall_service.get_card("Lightning Bolt")


@pytest.mark.asyncio
async def test_fetch_card_retries_on_429(mock_scryfall):
    """A 429 response should be retried and eventually succeed."""
    call_count = 0

    def side_effect(request):
        nonlocal call_count
        call_count += 1
        if call_count < 3:
            return httpx.Response(429, text="Too Many Requests")
        return httpx.Response(200, json=MOCK_CARD)

    mock_scryfall.get("/cards/named").mock(side_effect=side_effect)
    result = await scryfall_service.get_card("Lightning Bolt")
    assert result["name"] == "Lightning Bolt"
    assert call_count == 3


@pytest.mark.asyncio
async def test_fetch_card_raises_after_max_429_retries(mock_scryfall):
    """Persistent 429 responses should eventually raise ScryfallAPIError."""
    mock_scryfall.get("/cards/named").mock(
        return_value=httpx.Response(429, text="Too Many Requests")
    )
    with pytest.raises(ScryfallAPIError, match="rate-limited"):
        await scryfall_service.get_card("Lightning Bolt")


@pytest.mark.asyncio
async def test_batch_fetch_returns_all_found_cards(mock_scryfall):
    """get_cards_batch fetches multiple cards in one collection request."""
    bolt = {"name": "Lightning Bolt", "image_uris": {"normal": "https://example.com/bolt.jpg"}}
    counterspell = {"name": "Counterspell", "image_uris": {"normal": "https://example.com/cs.jpg"}}
    mock_scryfall.post("/cards/collection").mock(
        return_value=httpx.Response(200, json={"data": [bolt, counterspell], "not_found": []})
    )
    found, not_found = await scryfall_service.get_cards_batch(["Lightning Bolt", "Counterspell"])
    assert found["Lightning Bolt"]["image_uri"] == "https://example.com/bolt.jpg"
    assert found["Counterspell"]["image_uri"] == "https://example.com/cs.jpg"
    assert not_found == []
    assert mock_scryfall.calls.call_count == 1


@pytest.mark.asyncio
async def test_batch_fetch_reports_not_found(mock_scryfall):
    bolt = {"name": "Lightning Bolt", "image_uris": {"normal": "https://example.com/bolt.jpg"}}
    mock_scryfall.post("/cards/collection").mock(
        return_value=httpx.Response(200, json={
            "data": [bolt],
            "not_found": [{"name": "Fake Card"}],
        })
    )
    found, not_found = await scryfall_service.get_cards_batch(["Lightning Bolt", "Fake Card"])
    assert "Lightning Bolt" in found
    assert "Fake Card" not in found
    assert "Fake Card" in not_found


@pytest.mark.asyncio
async def test_batch_fetch_uses_cache_for_known_cards(mock_scryfall):
    bolt = {"name": "Lightning Bolt", "image_uris": {"normal": "https://example.com/bolt.jpg"}}
    mock_scryfall.post("/cards/collection").mock(
        return_value=httpx.Response(200, json={"data": [bolt], "not_found": []})
    )
    # Prime cache via first batch call
    await scryfall_service.get_cards_batch(["Lightning Bolt"])
    # Second call should serve from cache without hitting the network
    found, _ = await scryfall_service.get_cards_batch(["Lightning Bolt"])
    assert found["Lightning Bolt"]["name"] == "Lightning Bolt"
    assert mock_scryfall.calls.call_count == 1  # only the first call made a request


@pytest.mark.asyncio
async def test_batch_fetch_splits_into_chunks_of_75(mock_scryfall):
    """A list of 80 cards should result in two collection requests (75 + 5)."""
    names = [f"Card {i}" for i in range(80)]
    cards = [
        {"name": n, "image_uris": {"normal": f"https://example.com/{i}.jpg"}}
        for i, n in enumerate(names)
    ]
    call_count = 0

    def side_effect(request):
        nonlocal call_count
        batch = request.content  # just to consume it
        start = call_count * 75
        end = min(start + 75, len(cards))
        call_count += 1
        return httpx.Response(200, json={"data": cards[start:end], "not_found": []})

    mock_scryfall.post("/cards/collection").mock(side_effect=side_effect)
    found, not_found = await scryfall_service.get_cards_batch(names)
    assert call_count == 2
    assert len(found) == 80
    assert not_found == []


@pytest.mark.asyncio
async def test_rate_limiter_allows_burst(mock_scryfall):
    """Ten concurrent fetches should all succeed within the semaphore limit."""
    responses = [
        {"name": f"Card {i}", "image_uris": {"normal": f"https://example.com/{i}.jpg"}}
        for i in range(10)
    ]
    idx = 0

    def side_effect(request):
        nonlocal idx
        response = httpx.Response(200, json=responses[idx % len(responses)])
        idx += 1
        return response

    mock_scryfall.get("/cards/named").mock(side_effect=side_effect)

    tasks = [scryfall_service.get_card(f"Card {i}") for i in range(10)]
    results = await asyncio.gather(*tasks)
    assert len(results) == 10
