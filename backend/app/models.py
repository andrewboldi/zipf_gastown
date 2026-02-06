"""Pydantic models for API responses."""
from pydantic import BaseModel


class TextInfo(BaseModel):
    """Basic information about a text."""
    id: str
    title: str
    word_count: int


class WordFrequency(BaseModel):
    """Word with its frequency count."""
    word: str
    count: int


class FrequencyResponse(BaseModel):
    """Response for word frequency endpoint."""
    text_id: str
    title: str
    total_words: int
    unique_words: int
    frequencies: list[WordFrequency]


class ZipfDataPoint(BaseModel):
    """A single point in the Zipf distribution."""
    rank: int
    word: str
    frequency: int
    expected_frequency: float  # Based on Zipf's law: C/rank


class ZipfResponse(BaseModel):
    """Response for Zipf analysis endpoint."""
    text_id: str
    title: str
    total_words: int
    zipf_constant: float  # The C value in f(r) = C/r
    data: list[ZipfDataPoint]
