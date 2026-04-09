import re
from typing import List, Tuple

# Matches: "4 Lightning Bolt (M21) 164"  or  "4 Lightning Bolt"
# Group 1 = quantity, Group 2 = card name
_LINE_RE = re.compile(
    r"^(\d+)\s+(.+?)(?:\s+\([A-Za-z0-9]+\)\s+\S+)?\s*$"
)

# Lines that should be silently skipped
_SKIP_RES = [
    re.compile(r"^\s*$"),                        # blank
    re.compile(r"^//"),                           # comment
    re.compile(r"^Deck\s*$", re.IGNORECASE),
    re.compile(r"^Sideboard\s*$", re.IGNORECASE),
    re.compile(r"^Commander\s*$", re.IGNORECASE),
]


def parse_decklist(text: str) -> List[Tuple[str, int]]:
    """
    Parse an MTGA-format decklist.

    Returns a list of (card_name, count) tuples.
    Lines that don't match the expected format are silently skipped.
    """
    results: List[Tuple[str, int]] = []

    for line in text.splitlines():
        stripped = line.strip()

        if any(pattern.match(stripped) for pattern in _SKIP_RES):
            continue

        m = _LINE_RE.match(stripped)
        if not m:
            continue

        count = int(m.group(1))
        name = m.group(2).strip()
        results.append((name, count))

    return results
