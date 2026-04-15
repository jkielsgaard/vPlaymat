import random
import time
from dataclasses import dataclass, field
from typing import Dict, List, Optional

from models.card import Card
from exceptions import EmptyLibraryError, CardNotFoundError

VALID_MODES = {"normal", "commander"}
SESSION_EXPIRY_SECONDS = 60 * 60  # 1 hour of inactivity


@dataclass
class GameState:
    cards: Dict[str, Card] = field(default_factory=dict)
    library_order: List[str] = field(default_factory=list)
    # Graveyard is ordered newest-on-top (index 0 = most recently placed)
    graveyard_order: List[str] = field(default_factory=list)
    life: int = 20
    game_mode: str = "normal"  # "normal" | "commander"
    commander_damage: Dict[str, int] = field(default_factory=dict)
    turn: int = 1
    opponent_count: int = 3
    opponent_names: List[str] = field(default_factory=list)
    poison_counters: int = 0
    commander_returns: int = 0
    # Spectator sync — which zone viewer the player currently has open (mirrored to spectators)
    active_viewer: Optional[str] = None  # "graveyard" | "exile" | None
    # Whether spectators are allowed to open the zone viewer independently
    spectator_zone_viewing: bool = False
    # Session tracking — not exposed to the frontend via to_dict()
    session_id: Optional[str] = field(default=None, compare=False)
    last_active: float = field(default=0.0, compare=False)  # unix timestamp

    # ------------------------------------------------------------------
    # Session management
    # ------------------------------------------------------------------

    def touch(self) -> None:
        """Update last-active timestamp to now."""
        self.last_active = time.time()

    def is_session_expired(self) -> bool:
        if self.last_active == 0.0:
            return True
        return (time.time() - self.last_active) > SESSION_EXPIRY_SECONDS

    def clear_state(self) -> None:
        """Wipe all game data. Used when an expired session is replaced."""
        self.cards = {}
        self.library_order = []
        self.graveyard_order = []
        self.life = 20
        self.game_mode = "normal"
        self.commander_damage = {}
        self.turn = 1
        self.opponent_count = 3
        self.opponent_names = []
        self.poison_counters = 0
        self.commander_returns = 0
        self.active_viewer = None

    # ------------------------------------------------------------------
    # Setup
    # ------------------------------------------------------------------

    def starting_life(self) -> int:
        return 40 if self.game_mode == "commander" else 20

    def reset(self, cards: List[Card]) -> None:
        """Replace current game state with a fresh deck. game_mode is preserved."""
        self.cards = {c.id: c for c in cards}
        self.library_order = [c.id for c in cards]
        self.graveyard_order = []
        self.life = self.starting_life()
        self.commander_damage = {}
        self.turn = 1
        self.poison_counters = 0

    def new_game(self) -> None:
        """Return all cards to library and shuffle. Preserves game_mode, opponent_count, opponent_names, and card data."""
        # Tokens do not persist between games — remove them
        self.cards = {k: v for k, v in self.cards.items() if not v.is_token}
        for card in self.cards.values():
            card.zone = "library"
            card.tapped = False
            card.x = 0.0
            card.y = 0.0
            card.face_down = False
            card.transformed = False
        self.library_order = list(self.cards.keys())
        self.graveyard_order = []
        self.life = self.starting_life()
        self.commander_damage = {}
        self.turn = 1
        self.poison_counters = 0
        self.commander_returns = 0
        self.active_viewer = None
        self.shuffle()
        # Restore the commander card to the command zone
        for card in self.cards.values():
            if card.is_commander:
                card.zone = "command"
                if card.id in self.library_order:
                    self.library_order.remove(card.id)
                break

    def set_mode(self, mode: str) -> None:
        if mode not in VALID_MODES:
            raise ValueError(f"Invalid game mode: {mode}")
        self.game_mode = mode
        self.life = self.starting_life()
        self.commander_damage = {}

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _get_card(self, card_id: str) -> Card:
        if card_id not in self.cards:
            raise CardNotFoundError(f"Card not found: {card_id}")
        return self.cards[card_id]

    # ------------------------------------------------------------------
    # Library / draw actions
    # ------------------------------------------------------------------

    def draw(self, count: int = 1) -> List[Card]:
        if not self.library_order:
            raise EmptyLibraryError("Cannot draw from an empty library")
        drawn: List[Card] = []
        actual = min(count, len(self.library_order))
        for _ in range(actual):
            card_id = self.library_order.pop(0)
            card = self.cards[card_id]
            card.zone = "hand"
            drawn.append(card)
        return drawn

    def shuffle(self) -> None:
        random.shuffle(self.library_order)

    def scry(self, keep_top: List[str], send_bottom: List[str]) -> None:
        all_decided = set(keep_top) | set(send_bottom)
        remaining = [cid for cid in self.library_order if cid not in all_decided]
        self.library_order = list(keep_top) + remaining + list(send_bottom)

    # ------------------------------------------------------------------
    # Card actions
    # ------------------------------------------------------------------

    def tap_card(self, card_id: str) -> Card:
        card = self._get_card(card_id)
        card.tapped = not card.tapped
        return card

    def move_card(
        self,
        card_id: str,
        zone: str,
        x: float = 0.0,
        y: float = 0.0,
        to_top: bool = False,
    ) -> Card:
        """
        Move a card to the given zone.
        to_top: when zone == "library", prepend instead of append.
        Graveyard maintains newest-on-top order (index 0 = most recent).
        Cards entering non-battlefield zones are untapped.
        Tokens leaving the battlefield cease to exist.
        """
        card = self._get_card(card_id)
        old_zone = card.zone

        # Remove from old zone ordering
        if old_zone == "library" and card_id in self.library_order:
            self.library_order.remove(card_id)
        if old_zone == "graveyard" and card_id in self.graveyard_order:
            self.graveyard_order.remove(card_id)

        card.zone = zone

        if zone == "battlefield":
            card.x = max(0.0, min(1.0, x))
            card.y = max(0.0, min(1.0, y))
        else:
            card.tapped = False

        # Face-down cards entering graveyard or exile are revealed (rules 707.9)
        if zone in ("graveyard", "exile"):
            card.face_down = False

        # Update ordering for new zone
        if zone == "library":
            if to_top:
                self.library_order.insert(0, card_id)
            else:
                self.library_order.append(card_id)
        elif zone == "graveyard":
            # Newest card goes to the front (top of graveyard)
            self.graveyard_order.insert(0, card_id)

        # Track commander returns to command zone (commander tax)
        PLAY_ZONES = {"battlefield", "graveyard", "exile", "hand"}
        if zone == "command" and card.is_commander and old_zone in PLAY_ZONES:
            self.commander_returns += 1

        # Tokens cease to exist when they leave the battlefield
        if card.is_token and zone != "battlefield":
            del self.cards[card_id]
            if card_id in self.graveyard_order:
                self.graveyard_order.remove(card_id)

        return card

    def update_position(self, card_id: str, x: float, y: float) -> Card:
        card = self._get_card(card_id)
        card.x = x
        card.y = y
        return card

    def untap_all(self) -> None:
        for card in self.cards.values():
            if card.zone == "battlefield":
                card.tapped = False

    def adjust_life(self, delta: int) -> int:
        self.life += delta
        return self.life

    def adjust_poison(self, delta: int) -> int:
        self.poison_counters = max(0, self.poison_counters + delta)
        return self.poison_counters

    def remove_all_counters(self, card_id: str) -> Card:
        card = self._get_card(card_id)
        card.counters = {}
        return card

    def add_counter(self, card_id: str, counter_type: str, delta: int) -> Card:
        card = self._get_card(card_id)
        current = card.counters.get(counter_type, 0)
        card.counters[counter_type] = current + delta
        return card

    def flip_card(self, card_id: str) -> Card:
        """Toggle the face-down state of a card (Morph / Manifest)."""
        card = self._get_card(card_id)
        card.face_down = not card.face_down
        return card

    def transform_card(self, card_id: str) -> Card:
        """Toggle between front and back face for a double-faced card."""
        card = self._get_card(card_id)
        if not card.back_image_uri:
            raise ValueError(f"Card '{card.name}' has no back face")
        card.transformed = not card.transformed
        return card

    def mulligan(self) -> List[Card]:
        hand_cards = [c for c in self.cards.values() if c.zone == "hand"]
        new_hand_size = max(0, len(hand_cards) - 1)
        for card in hand_cards:
            card.zone = "library"
            self.library_order.append(card.id)
        self.shuffle()
        if new_hand_size > 0 and self.library_order:
            return self.draw(new_hand_size)
        return []

    # ------------------------------------------------------------------
    # Commander damage
    # ------------------------------------------------------------------

    def add_commander_damage(self, source: str, amount: int) -> int:
        current = self.commander_damage.get(source, 0)
        self.commander_damage[source] = current + amount
        self.life -= amount
        return self.commander_damage[source]

    def next_turn(self) -> Optional[Card]:
        self.turn += 1
        self.untap_all()
        if self.library_order:
            drawn = self.draw(1)
            return drawn[0] if drawn else None
        return None

    def create_token(self, name: str, image_uri: str, x: float = 0.5, y: float = 0.5) -> Card:
        token = Card(
            name=name,
            image_uri=image_uri,
            zone="battlefield",
            x=max(0.0, min(1.0, x)),
            y=max(0.0, min(1.0, y)),
            is_token=True,
        )
        self.cards[token.id] = token
        return token

    def check_commander_loss(self) -> Optional[str]:
        for source, damage in self.commander_damage.items():
            if damage >= 21:
                return source
        return None

    # ------------------------------------------------------------------
    # Serialisation / deserialisation
    # ------------------------------------------------------------------

    @classmethod
    def from_dict(cls, data: dict, session_id: str) -> "GameState":
        """Reconstruct a GameState from a persisted dict (e.g. loaded from disk)."""
        cards = {
            cid: Card(
                id=cid,
                name=c["name"],
                image_uri=c["image_uri"],
                back_image_uri=c.get("back_image_uri", ""),
                zone=c["zone"],
                tapped=c.get("tapped", False),
                counters=c.get("counters", {}),
                x=c.get("x", 0.0),
                y=c.get("y", 0.0),
                is_commander=c.get("is_commander", False),
                is_token=c.get("is_token", False),
                face_down=c.get("face_down", False),
                transformed=c.get("transformed", False),
            )
            for cid, c in data.get("cards", {}).items()
        }
        state = cls(
            cards=cards,
            library_order=data.get("library_order", []),
            graveyard_order=data.get("graveyard_order", []),
            life=data.get("life", 20),
            game_mode=data.get("game_mode", "normal"),
            commander_damage=data.get("commander_damage", {}),
            turn=data.get("turn", 1),
            opponent_count=data.get("opponent_count", 3),
            opponent_names=data.get("opponent_names", []),
            poison_counters=data.get("poison_counters", 0),
            commander_returns=data.get("commander_returns", 0),
            active_viewer=data.get("active_viewer"),
            spectator_zone_viewing=data.get("spectator_zone_viewing", False),
            session_id=session_id,
            last_active=data.get("last_active", 0.0),
        )
        return state

    def to_dict(self) -> dict:
        """Serialise for the frontend (no internal fields)."""
        return {
            "cards": {k: v.to_dict() for k, v in self.cards.items()},
            "library_order": list(self.library_order),
            "graveyard_order": list(self.graveyard_order),
            "life": self.life,
            "game_mode": self.game_mode,
            "commander_damage": dict(self.commander_damage),
            "turn": self.turn,
            "opponent_count": self.opponent_count,
            "opponent_names": list(self.opponent_names),
            "poison_counters": self.poison_counters,
            "commander_returns": self.commander_returns,
            "active_viewer": self.active_viewer,
            "spectator_zone_viewing": self.spectator_zone_viewing,
        }

    def to_persist_dict(self) -> dict:
        """Serialise for disk storage — includes last_active for expiry checks."""
        d = self.to_dict()
        d["last_active"] = self.last_active
        return d
