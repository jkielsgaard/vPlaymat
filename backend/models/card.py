from dataclasses import dataclass, field, asdict
from typing import Dict
import uuid


def _new_id() -> str:
    return str(uuid.uuid4())


@dataclass
class Card:
    name: str
    image_uri: str
    zone: str  # "library" | "hand" | "battlefield" | "graveyard" | "exile" | "command"
    id: str = field(default_factory=_new_id)
    tapped: bool = False
    counters: Dict[str, int] = field(default_factory=dict)
    x: float = 0.0
    y: float = 0.0
    is_commander: bool = False
    is_token: bool = False
    # Face-down (Morph, Manifest) — hides the card image while on the battlefield
    face_down: bool = False
    # Double-faced card back image (DFC / transform) — empty string if single-faced
    back_image_uri: str = ""
    # Whether the card is currently showing its back face
    transformed: bool = False

    def to_dict(self) -> dict:
        return asdict(self)
