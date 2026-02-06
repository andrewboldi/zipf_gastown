"""Tests for text processing utilities."""
import pytest
from collections import Counter

from app.text_processor import (
    normalize_text,
    tokenize,
    compute_frequencies,
    compute_zipf_constant,
)


class TestNormalizeText:
    """Tests for normalize_text function."""

    def test_lowercase(self):
        assert normalize_text("Hello World") == "hello world"

    def test_removes_punctuation(self):
        assert normalize_text("Hello, World!") == "hello world"

    def test_removes_numbers(self):
        assert normalize_text("Test 123 text") == "test text"

    def test_collapses_spaces(self):
        assert normalize_text("Hello    World") == "hello world"

    def test_empty_string(self):
        assert normalize_text("") == ""

    def test_only_punctuation(self):
        assert normalize_text("!@#$%") == ""

    def test_mixed_content(self):
        text = "The quick-brown fox, jumped! Over 3 lazy dogs."
        expected = "the quick brown fox jumped over lazy dogs"
        assert normalize_text(text) == expected


class TestTokenize:
    """Tests for tokenize function."""

    def test_simple_text(self):
        assert tokenize("hello world") == ["hello", "world"]

    def test_empty_string(self):
        assert tokenize("") == []

    def test_single_word(self):
        assert tokenize("hello") == ["hello"]


class TestComputeFrequencies:
    """Tests for compute_frequencies function."""

    def test_simple_text(self):
        freq = compute_frequencies("the cat and the dog")
        assert freq["the"] == 2
        assert freq["cat"] == 1
        assert freq["and"] == 1
        assert freq["dog"] == 1

    def test_empty_text(self):
        freq = compute_frequencies("")
        assert len(freq) == 0

    def test_repeated_word(self):
        freq = compute_frequencies("test test test")
        assert freq["test"] == 3
        assert len(freq) == 1


class TestComputeZipfConstant:
    """Tests for compute_zipf_constant function."""

    def test_simple_frequencies(self):
        freq = Counter({"the": 100, "of": 50, "and": 25})
        assert compute_zipf_constant(freq) == 100.0

    def test_empty_frequencies(self):
        freq = Counter()
        assert compute_zipf_constant(freq) == 0.0
