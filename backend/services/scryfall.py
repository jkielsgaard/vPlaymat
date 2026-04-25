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

async def _fetch_chunk(
    chunk: List[Tuple[str, str, str]],
    client: httpx.AsyncClient,
) -> Tuple[Dict[str, dict], List[Tuple[str, str, str]]]:
    """
    Send one /cards/collection request for up to 75 entries.

    Uses set+number identifiers where available; falls back to name identifiers
    otherwise. Returns (found_dict, unresolved_entries) where unresolved_entries
    are the original (name, set_code, col_num) tuples that Scryfall did not return.
    """
    identifiers = []
    set_num_to_name: Dict[Tuple[str, str], str] = {}
    for name, set_code, col_num in chunk:
        if set_code and col_num:
            key = (set_code.lower(), col_num.lower())
            set_num_to_name[key] = name
            identifiers.append({"set": set_code.lower(), "collector_number": col_num.lower()})
        else:
            identifiers.append({"name": name})

    try:
        response = await client.post("/cards/collection", json={"identifiers": identifiers})
    except httpx.HTTPError as exc:
        raise ScryfallAPIError(f"HTTP error fetching card collection: {exc}") from exc

    if response.status_code != 200:
        raise ScryfallAPIError(f"Scryfall collection returned {response.status_code}")

    body = response.json()

    by_name: Dict[str, dict] = {}
    by_set_num: Dict[Tuple[str, str], dict] = {}
    for card_data in body.get("data", []):
        result = _build_result(card_data)
        by_name[card_data["name"].lower()] = result
        if "set" in card_data and "collector_number" in card_data:
            key = (card_data["set"].lower(), card_data["collector_number"].lower())
            by_set_num[key] = result

    found: Dict[str, dict] = {}
    unresolved: List[Tuple[str, str, str]] = []
    for name, set_code, col_num in chunk:
        if set_code and col_num:
            result = by_set_num.get((set_code.lower(), col_num.lower()))
        else:
            result = by_name.get(name.lower())

        if result:
            _cache[name.lower()] = result
            found[name] = result
        else:
            unresolved.append((name, set_code, col_num))

    return found, unresolved


async def get_cards_batch(
    entries: List[Tuple[str, str, str]],
) -> Tuple[Dict[str, dict], List[str]]:
    """
    Fetch multiple cards from Scryfall using the /cards/collection endpoint.
    Processes up to 75 unique entries per HTTP request.

    Each entry is (name, set_code, collector_number). When set_code and
    collector_number are both non-empty the lookup uses set+number first
    (required for flavour-titled reprints like Moxfield). If set+number
    fails, the card is retried by name so PLST and other non-standard
    collector numbers still resolve.
    Results are always keyed by the requested name.

    Returns:
        found      – dict mapping each requested name to {"name", "image_uri"}
        not_found  – list of requested names Scryfall could not match
    """
    found: Dict[str, dict] = {}
    uncached: List[Tuple[str, str, str]] = []

    for name, set_code, col_num in entries:
        cached = _cache.get(name.lower())
        if cached:
            found[name] = cached
        else:
            uncached.append((name, set_code, col_num))

    if not uncached:
        return found, []

    client = _get_client()

    # Pass 1: use set+number identifiers where available.
    name_fallback: List[Tuple[str, str, str]] = []
    for i in range(0, len(uncached), 75):
        chunk_found, unresolved = await _fetch_chunk(uncached[i : i + 75], client)
        found.update(chunk_found)
        # Cards with a set+number that Scryfall couldn't resolve get a name-only retry.
        # Cards without set+number that Scryfall couldn't resolve are truly not found.
        for name, set_code, col_num in unresolved:
            if set_code and col_num:
                name_fallback.append((name, "", ""))

    # Pass 2: retry set+number failures using name-only lookup.
    not_found: List[str] = []
    for i in range(0, len(name_fallback), 75):
        chunk_found, unresolved = await _fetch_chunk(name_fallback[i : i + 75], client)
        found.update(chunk_found)
        not_found.extend(name for name, _, _ in unresolved)

    # Collect names that failed both passes (no set+number, name-only also failed).
    for name, set_code, col_num in uncached:
        if name not in found and name not in not_found:
            not_found.append(name)

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
