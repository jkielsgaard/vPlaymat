"""Tests for the MTGA decklist parser — valid formats, skipped lines, and edge cases."""
import pytest
from services.deck_parser import parse_decklist


def test_parse_valid_line_with_set():
    result = parse_decklist("4 Lightning Bolt (M21) 164")
    assert result == [("Lightning Bolt", 4)]


def test_parse_valid_line_without_set():
    result = parse_decklist("4 Lightning Bolt")
    assert result == [("Lightning Bolt", 4)]


def test_parse_multiline_decklist():
    text = "4 Lightning Bolt\n2 Counterspell (2ED) 55\n1 Black Lotus"
    result = parse_decklist(text)
    assert result == [
        ("Lightning Bolt", 4),
        ("Counterspell", 2),
        ("Black Lotus", 1),
    ]


def test_parse_ignores_blank_lines():
    text = "\n4 Lightning Bolt\n\n2 Counterspell\n"
    result = parse_decklist(text)
    assert result == [("Lightning Bolt", 4), ("Counterspell", 2)]


def test_parse_ignores_comment_lines():
    text = "// My spicy deck\n4 Lightning Bolt\n// end"
    result = parse_decklist(text)
    assert result == [("Lightning Bolt", 4)]


def test_parse_ignores_sideboard_header():
    text = "4 Lightning Bolt\nSideboard\n2 Duress"
    result = parse_decklist(text)
    assert result == [("Lightning Bolt", 4), ("Duress", 2)]


def test_parse_ignores_deck_header():
    text = "Deck\n4 Lightning Bolt"
    result = parse_decklist(text)
    assert result == [("Lightning Bolt", 4)]


def test_parse_empty_input():
    assert parse_decklist("") == []


def test_parse_returns_correct_count():
    result = parse_decklist("4 Mountain")
    assert result == [("Mountain", 4)]


def test_parse_multiword_card_names():
    result = parse_decklist("4 Birds of Paradise (M12) 165\n1 Tarmogoyf")
    assert ("Birds of Paradise", 4) in result
    assert ("Tarmogoyf", 1) in result


def test_parse_single_copy():
    result = parse_decklist("1 Sol Ring (C21) 263")
    assert result == [("Sol Ring", 1)]


def test_parse_commander_header_skipped():
    text = "Commander\n1 Atraxa, Praetors' Voice\nDeck\n4 Forest"
    result = parse_decklist(text)
    assert ("Atraxa, Praetors' Voice", 1) in result
    assert ("Forest", 4) in result
