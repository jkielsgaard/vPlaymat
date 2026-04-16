"""Custom exception classes raised by game logic and external service calls."""


class EmptyLibraryError(Exception):
    """Raised when drawing from an empty library."""


class CardNotFoundError(Exception):
    """Raised when a card ID or name is not found."""


class InvalidMoveError(Exception):
    """Raised when a card move is not valid."""


class ScryfallAPIError(Exception):
    """Raised when the Scryfall API returns an unexpected error."""


class CardNotFoundScryfallError(ScryfallAPIError):
    """Raised when Scryfall returns 404 for a card name lookup."""
