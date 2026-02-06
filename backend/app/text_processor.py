"""Text processing utilities for Zipf analysis."""
import re
from collections import Counter


def normalize_text(text: str) -> str:
    """Normalize text to lowercase and remove punctuation.

    Args:
        text: Raw text content

    Returns:
        Normalized text with only lowercase words
    """
    # Convert to lowercase
    text = text.lower()
    # Replace non-alphabetic characters with spaces (keeps word boundaries)
    text = re.sub(r"[^a-z\s]", " ", text)
    # Collapse multiple spaces
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def tokenize(text: str) -> list[str]:
    """Split normalized text into word tokens.

    Args:
        text: Normalized text (lowercase, no punctuation)

    Returns:
        List of word tokens
    """
    if not text:
        return []
    return text.split()


def compute_frequencies(text: str) -> Counter:
    """Compute word frequencies from raw text.

    Args:
        text: Raw text content

    Returns:
        Counter mapping words to their frequency counts
    """
    normalized = normalize_text(text)
    tokens = tokenize(normalized)
    return Counter(tokens)


def compute_zipf_constant(frequencies: Counter) -> float:
    """Compute the Zipf constant C where f(r) ≈ C/r.

    The constant is estimated as the frequency of the most common word,
    which should equal C/1 = C.

    Args:
        frequencies: Counter of word frequencies

    Returns:
        Estimated Zipf constant
    """
    if not frequencies:
        return 0.0
    # C ≈ frequency of rank 1 word
    return float(frequencies.most_common(1)[0][1])
