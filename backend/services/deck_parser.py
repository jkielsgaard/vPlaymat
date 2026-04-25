"""MTGA decklist parser — converts raw text into (card_name, count, set_code, collector_number) tuples."""
import re
from typing import List, Tuple

# Matches: "4 Lightning Bolt (M21) 164"  or  "4 Lightning Bolt (MKC) 8 *F*"
#          "1 Ainok Bond-Kin (PLST) KTK-3"  or  "1 Helm of Kaldra (P5DN) 131★ *F*"
# Groups: 1=quantity  2=card name  3=set code (optional)  4=collector number (optional)
# Collector number accepts any non-whitespace token — covers digits, PLST-style (KTK-3),
# promo stars (131★), and any future formats Moxfield may introduce.
# Trailing *X* tokens (foil markers etc.) are consumed and discarded.
_LINE_RE = re.compile(
    r"^(\d+)\s+(.+?)(?:\s+\(([A-Za-z0-9]+)\)\s+(\S+?)(?:\s+\*[A-Z]\*)*)?\s*$"
)

# Lines that should be silently skipped
_SKIP_RES = [
    re.compile(r"^\s*$"),                        # blank
    re.compile(r"^//"),                           # comment
    re.compile(r"^Deck\s*$", re.IGNORECASE),
    re.compile(r"^Sideboard\s*$", re.IGNORECASE),
    re.compile(r"^Commander\s*$", re.IGNORECASE),
]


def parse_decklist(text: str) -> List[Tuple[str, int, str, str]]:
    """
    Parse an MTGA-format decklist.

    Returns a list of (card_name, count, set_code, collector_number) tuples.
    set_code and collector_number are empty strings when not present in the line.
    Lines that don't match the expected format are silently skipped.
    """
    results: List[Tuple[str, int, str, str]] = []

    for line in text.splitlines():
        stripped = line.strip()

        if any(pattern.match(stripped) for pattern in _SKIP_RES):
            continue

        m = _LINE_RE.match(stripped)
        if not m:
            continue

        count = int(m.group(1))
        name = m.group(2).strip()
        set_code = (m.group(3) or "").strip()
        collector_number = (m.group(4) or "").strip()
        results.append((name, count, set_code, collector_number))

    return results
