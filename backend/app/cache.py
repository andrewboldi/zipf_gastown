"""Simple in-memory cache for computed frequencies."""
from collections import Counter
from dataclasses import dataclass


@dataclass
class CachedText:
    """Cached text data with computed frequencies."""
    title: str
    content: str
    frequencies: Counter


class FrequencyCache:
    """In-memory cache for text frequencies."""

    def __init__(self):
        self._cache: dict[str, CachedText] = {}

    def get(self, text_id: str) -> CachedText | None:
        """Get cached text data by ID."""
        return self._cache.get(text_id)

    def set(self, text_id: str, data: CachedText) -> None:
        """Cache text data."""
        self._cache[text_id] = data

    def has(self, text_id: str) -> bool:
        """Check if text is cached."""
        return text_id in self._cache

    def list_ids(self) -> list[str]:
        """Get all cached text IDs."""
        return list(self._cache.keys())

    def clear(self) -> None:
        """Clear all cached data."""
        self._cache.clear()


# Global cache instance
cache = FrequencyCache()
