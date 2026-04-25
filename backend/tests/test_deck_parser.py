"""Tests for the MTGA decklist parser — valid formats, skipped lines, and edge cases."""
import pytest
from services.deck_parser import parse_decklist


def test_parse_valid_line_with_set():
    result = parse_decklist("4 Lightning Bolt (M21) 164")
    assert result == [("Lightning Bolt", 4, "M21", "164")]


def test_parse_valid_line_without_set():
    result = parse_decklist("4 Lightning Bolt")
    assert result == [("Lightning Bolt", 4, "", "")]


def test_parse_multiline_decklist():
    text = "4 Lightning Bolt\n2 Counterspell (2ED) 55\n1 Black Lotus"
    result = parse_decklist(text)
    assert result == [
        ("Lightning Bolt", 4, "", ""),
        ("Counterspell", 2, "2ED", "55"),
        ("Black Lotus", 1, "", ""),
    ]


def test_parse_ignores_blank_lines():
    text = "\n4 Lightning Bolt\n\n2 Counterspell\n"
    result = parse_decklist(text)
    assert result == [("Lightning Bolt", 4, "", ""), ("Counterspell", 2, "", "")]


def test_parse_ignores_comment_lines():
    text = "// My spicy deck\n4 Lightning Bolt\n// end"
    result = parse_decklist(text)
    assert result == [("Lightning Bolt", 4, "", "")]


def test_parse_ignores_sideboard_header():
    text = "4 Lightning Bolt\nSideboard\n2 Duress"
    result = parse_decklist(text)
    assert result == [("Lightning Bolt", 4, "", ""), ("Duress", 2, "", "")]


def test_parse_ignores_deck_header():
    text = "Deck\n4 Lightning Bolt"
    result = parse_decklist(text)
    assert result == [("Lightning Bolt", 4, "", "")]


def test_parse_empty_input():
    assert parse_decklist("") == []


def test_parse_returns_correct_count():
    result = parse_decklist("4 Mountain")
    assert result == [("Mountain", 4, "", "")]


def test_parse_multiword_card_names():
    result = parse_decklist("4 Birds of Paradise (M12) 165\n1 Tarmogoyf")
    assert ("Birds of Paradise", 4, "M12", "165") in result
    assert ("Tarmogoyf", 1, "", "") in result


def test_parse_single_copy():
    result = parse_decklist("1 Sol Ring (C21) 263")
    assert result == [("Sol Ring", 1, "C21", "263")]


def test_parse_commander_header_skipped():
    text = "Commander\n1 Atraxa, Praetors' Voice\nDeck\n4 Forest"
    result = parse_decklist(text)
    assert ("Atraxa, Praetors' Voice", 1, "", "") in result
    assert ("Forest", 4, "", "") in result


def test_parse_foil_suffix_stripped():
    """Moxfield foil lines include a trailing *F* token — card name must be clean."""
    result = parse_decklist("1 Sophia, Dogged Detective (MKC) 8 *F*")
    assert result == [("Sophia, Dogged Detective", 1, "MKC", "8")]


def test_parse_foil_suffix_name_only_not_affected():
    """A non-foil line with set+number should still parse correctly."""
    result = parse_decklist("1 Dogmeat, Ever Loyal (PIP) 1")
    assert result == [("Dogmeat, Ever Loyal", 1, "PIP", "1")]


def test_parse_plst_collector_number():
    """PLST (The List) cards use SET-NUM format collector numbers like KTK-3."""
    result = parse_decklist("1 Ainok Bond-Kin (PLST) KTK-3")
    assert result == [("Ainok Bond-Kin", 1, "PLST", "KTK-3")]


def test_parse_plst_alphanumeric_collector_number():
    """PLST collector numbers can have alphanumeric prefixes like A25-50."""
    result = parse_decklist("1 Counterspell (PLST) A25-50")
    assert result == [("Counterspell", 1, "PLST", "A25-50")]


def test_parse_promo_star_collector_number():
    """Moxfield promo collector numbers include a trailing ★ character."""
    result = parse_decklist("1 Some Promo Card (PSET) 131★")
    assert result == [("Some Promo Card", 1, "PSET", "131★")]


def test_parse_promo_star_with_foil_suffix():
    """Promo ★ collector number combined with *F* foil marker — both handled."""
    result = parse_decklist("1 Some Promo Card (PSET) 131★ *F*")
    assert result == [("Some Promo Card", 1, "PSET", "131★")]


# ---------------------------------------------------------------------------
# Regression tests — real cards that were reported as failing to import
# ---------------------------------------------------------------------------

def test_regression_sophia_dogged_detective_foil():
    """Foil card with single-digit collector number."""
    result = parse_decklist("1 Sophia, Dogged Detective (MKC) 8 *F*")
    assert result == [("Sophia, Dogged Detective", 1, "MKC", "8")]


def test_regression_dogmeat_moxfield_flavour_title():
    """Moxfield exports the flavour title, not the canonical Scryfall name."""
    result = parse_decklist("1 Dogmeat, Constant Companion (PIP) 1")
    assert result == [("Dogmeat, Constant Companion", 1, "PIP", "1")]


def test_regression_ainok_bond_kin_plst():
    """PLST card with SET-NUM style collector number."""
    result = parse_decklist("1 Ainok Bond-Kin (PLST) KTK-3")
    assert result == [("Ainok Bond-Kin", 1, "PLST", "KTK-3")]


def test_regression_helm_of_kaldra_promo_foil():
    """P5DN promo with ★ collector number and *F* foil marker."""
    result = parse_decklist("1 Helm of Kaldra (P5DN) 131★ *F*")
    assert result == [("Helm of Kaldra", 1, "P5DN", "131★")]


def test_regression_shield_of_kaldra_promo_foil():
    """PDST promo with ★ collector number and *F* foil marker."""
    result = parse_decklist("1 Shield of Kaldra (PDST) 139★ *F*")
    assert result == [("Shield of Kaldra", 1, "PDST", "139★")]


def test_regression_sword_of_kaldra_promo_foil():
    """PMRD promo with ★ collector number and *F* foil marker."""
    result = parse_decklist("1 Sword of Kaldra (PMRD) 251★ *F*")
    assert result == [("Sword of Kaldra", 1, "PMRD", "251★")]
