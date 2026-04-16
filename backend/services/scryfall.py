"""Scryfall API client — card lookups, batch imports, and token searches."""
import asyncio
from typing import Dict, List, Optional, Tuple, Any

import httpx

from exceptions import CardNotFoundError, ScryfallAPIError

SCRYFALL_BASE = "https://api.scryfall.com"

# Cache keyed by lowercased card name for case-insensitive hits
_cache: Dict[str, dict] = {}
_semaphore = asyncio.Semaphore(10)
_client: Optional[httpx.AsyncClient] = None


# ---------------------------------------------------------------------------
# Client management (allows test injection)
# ---------------------------------------------------------------------------

def _get_client() -> httpx.AsyncClient:
    global _client
    if _client is None:
        _client = httpx.AsyncClient(base_url=SCRYFALL_BASE, timeout=30.0)
    return _client


def set_client(client: Optional[httpx.AsyncClient]) -> None:
    """Replace the module-level httpx client (used in tests)."""
    global _client
    _client = client


def clear_cache() -> None:
    _cache.clear()


# ---------------------------------------------------------------------------
# Image URI extraction (handles double-faced cards)
# ---------------------------------------------------------------------------

def _extract_image_uri(data: dict) -> str:
    if "image_uris" in data:
        return data["image_uris"]["normal"]
    if "card_faces" in data and data["card_faces"]:
        face = data["card_faces"][0]
        if "image_uris" in face:
            return face["image_uris"]["normal"]
    raise ScryfallAPIError(f"No image URI found for: {data.get('name')}")


def _build_result(card_data: dict) -> dict:
    result: dict = {
        "name": card_data["name"],
        "image_uri": _extract_image_uri(card_data),
        "back_image_uri": "",
    }
    # Store the back-face image for double-faced cards (transform, modal DFC, etc.)
    if "card_faces" in card_data and len(card_data["card_faces"]) >= 2:
        back_face = card_data["card_faces"][1]
        if "image_uris" in back_face:
            result["back_image_uri"] = back_face["image_uris"]["normal"]
    return result


# ---------------------------------------------------------------------------
# Public API — batch (preferred for deck import)
# ---------------------------------------------------------------------------

async def get_cards_batch(names: List[str]) -> Tuple[Dict[str, dict], List[str]]:
    """
    Fetch multiple cards from Scryfall using the /cards/collection endpoint.
    Processes up to 75 unique names per HTTP request, so a 100-card deck
    needs only 1-2 requests instead of ~80 sequential ones.

    Returns:
        found      – dict mapping each requested name to {"name", "image_uri"}
        not_found  – list of requested names Scryfall could not match
    """
    found: Dict[str, dict] = {}
    uncached: List[str] = []

    for name in names:
        cached = _cache.get(name.lower())
        if cached:
            found[name] = cached
        else:
            uncached.append(name)

    if not uncached:
        return found, []

    not_found: List[str] = []
    client = _get_client()

    # Scryfall collection endpoint accepts max 75 identifiers per request
    for i in range(0, len(uncached), 75):
        chunk = uncached[i : i + 75]
        try:
            response = await client.post(
                "/cards/collection",
                json={"identifiers": [{"name": n} for n in chunk]},
            )
        except httpx.HTTPError as exc:
            raise ScryfallAPIError(f"HTTP error fetching card collection: {exc}") from exc

        if response.status_code != 200:
            raise ScryfallAPIError(
                f"Scryfall collection returned {response.status_code}"
            )

        body = response.json()

        # Map canonical (lowercased) name → result for matching back to requested names
        canonical: Dict[str, dict] = {}
        for card_data in body.get("data", []):
            result = _build_result(card_data)
            canonical[card_data["name"].lower()] = result

        for req_name in chunk:
            result = canonical.get(req_name.lower())
            if result:
                _cache[req_name.lower()] = result
                found[req_name] = result
            else:
                not_found.append(req_name)

        # Track any explicit not_found identifiers Scryfall returns
        for nf in body.get("not_found", []):
            nf_name = nf.get("name", "")
            if nf_name and nf_name not in not_found:
                not_found.append(nf_name)

    return found, not_found


# ---------------------------------------------------------------------------
# Public API — single card (used for one-off lookups)
# ---------------------------------------------------------------------------

async def get_card(name: str) -> dict:
    """
    Fetch a single card by exact name from Scryfall.

    Returns {"name": str, "image_uri": str}.
    Results are cached. For importing whole decks use get_cards_batch instead.

    Raises:
        CardNotFoundError: if Scryfall returns 404.
        ScryfallAPIError: for any other HTTP or parse failure.
    """
    cached = _cache.get(name.lower())
    if cached:
        return cached

    async with _semaphore:
        client = _get_client()
        max_retries = 3
        retry_delay = 1.0

        for attempt in range(max_retries):
            try:
                response = await client.get("/cards/named", params={"exact": name})
            except httpx.HTTPError as exc:
                raise ScryfallAPIError(f"HTTP error fetching '{name}': {exc}") from exc

            if response.status_code == 429:
                if attempt < max_retries - 1:
                    await asyncio.sleep(retry_delay * (2 ** attempt))
                    continue
                raise ScryfallAPIError(
                    f"Scryfall rate-limited '{name}' after {max_retries} attempts"
                )

            if response.status_code == 404:
                raise CardNotFoundError(f"Card not found on Scryfall: {name}")
            if response.status_code != 200:
                raise ScryfallAPIError(
                    f"Scryfall returned {response.status_code} for '{name}'"
                )

            data = response.json()
            result = _build_result(data)
            _cache[name.lower()] = result
            return result

        raise ScryfallAPIError(f"Failed to fetch '{name}' after {max_retries} attempts")


# ---------------------------------------------------------------------------
# Public API — token search
# ---------------------------------------------------------------------------

async def search_tokens(query: str) -> List[Dict[str, Any]]:
    """
    Search Scryfall for token cards matching the query name.
    Returns a list of {"name", "image_uri"} dicts, up to 20 results.
    """
    if not query.strip():
        return []
    client = _get_client()
    try:
        response = await client.get(
            "/cards/search",
            params={"q": f"type:token name:{query}", "unique": "cards", "order": "name"},
        )
    except httpx.HTTPError as exc:
        raise ScryfallAPIError(f"HTTP error searching tokens: {exc}") from exc

    if response.status_code == 404:
        return []  # No results
    if response.status_code != 200:
        raise ScryfallAPIError(f"Scryfall token search returned {response.status_code}")

    body = response.json()
    results = []
    for card_data in body.get("data", [])[:20]:
        try:
            results.append(_build_result(card_data))
        except ScryfallAPIError:
            pass  # Skip cards with no image
    return results
