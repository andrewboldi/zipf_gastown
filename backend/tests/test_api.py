"""Tests for FastAPI endpoints."""
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.cache import cache, CachedText
from app.text_processor import compute_frequencies


@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)


@pytest.fixture(autouse=True)
def clear_cache():
    """Clear cache before each test."""
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def sample_text():
    """Add a sample text to cache."""
    content = "The quick brown fox jumps over the lazy dog. The fox is quick."
    frequencies = compute_frequencies(content)
    cache.set("sample", CachedText(
        title="Sample Text",
        content=content,
        frequencies=frequencies,
    ))
    return "sample"


class TestListTexts:
    """Tests for GET /texts endpoint."""

    def test_empty_list(self, client):
        response = client.get("/texts")
        assert response.status_code == 200
        assert response.json() == []

    def test_with_text(self, client, sample_text):
        response = client.get("/texts")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["id"] == "sample"
        assert data[0]["title"] == "Sample Text"
        assert data[0]["word_count"] > 0


class TestGetFrequency:
    """Tests for GET /texts/{id}/frequency endpoint."""

    def test_not_found(self, client):
        response = client.get("/texts/nonexistent/frequency")
        assert response.status_code == 404

    def test_with_text(self, client, sample_text):
        response = client.get("/texts/sample/frequency")
        assert response.status_code == 200
        data = response.json()
        assert data["text_id"] == "sample"
        assert data["title"] == "Sample Text"
        assert data["total_words"] > 0
        assert data["unique_words"] > 0
        assert len(data["frequencies"]) > 0
        # First word should have highest frequency
        assert data["frequencies"][0]["count"] >= data["frequencies"][-1]["count"]


class TestGetZipf:
    """Tests for GET /texts/{id}/zipf endpoint."""

    def test_not_found(self, client):
        response = client.get("/texts/nonexistent/zipf")
        assert response.status_code == 404

    def test_with_text(self, client, sample_text):
        response = client.get("/texts/sample/zipf")
        assert response.status_code == 200
        data = response.json()
        assert data["text_id"] == "sample"
        assert data["title"] == "Sample Text"
        assert data["zipf_constant"] > 0
        assert len(data["data"]) > 0
        # Check ranks are sequential
        for i, point in enumerate(data["data"], start=1):
            assert point["rank"] == i
        # Expected frequency should decrease with rank
        assert data["data"][0]["expected_frequency"] >= data["data"][-1]["expected_frequency"]
