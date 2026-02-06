"""FastAPI backend for Zipf's Law visualization."""
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .cache import cache, CachedText
from .models import (
    FrequencyResponse,
    TextInfo,
    WordFrequency,
    ZipfDataPoint,
    ZipfResponse,
)
from .text_processor import compute_frequencies, compute_zipf_constant


# Data directory for text files
DATA_DIR = Path(__file__).parent.parent.parent / "data" / "raw"


def load_texts_from_disk() -> None:
    """Load text files from data directory into cache."""
    if not DATA_DIR.exists():
        return

    for txt_file in DATA_DIR.glob("*.txt"):
        text_id = txt_file.stem
        if cache.has(text_id):
            continue

        content = txt_file.read_text(encoding="utf-8", errors="ignore")
        frequencies = compute_frequencies(content)

        # Use filename as title, replacing underscores with spaces
        title = text_id.replace("_", " ").title()

        cache.set(text_id, CachedText(
            title=title,
            content=content,
            frequencies=frequencies,
        ))


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load texts on startup."""
    load_texts_from_disk()
    yield


app = FastAPI(
    title="Zipf's Law API",
    description="API for text frequency analysis and Zipf's law visualization",
    version="0.1.0",
    lifespan=lifespan,
)

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/texts", response_model=list[TextInfo])
async def list_texts() -> list[TextInfo]:
    """List all available texts.

    Returns:
        List of text metadata including ID, title, and word count.
    """
    # Reload from disk in case new files were added
    load_texts_from_disk()

    result = []
    for text_id in cache.list_ids():
        cached = cache.get(text_id)
        if cached:
            result.append(TextInfo(
                id=text_id,
                title=cached.title,
                word_count=sum(cached.frequencies.values()),
            ))
    return result


@app.get("/texts/{text_id}/frequency", response_model=FrequencyResponse)
async def get_frequency(text_id: str) -> FrequencyResponse:
    """Get word frequency data for a text.

    Args:
        text_id: The text identifier

    Returns:
        Word frequency data sorted by frequency (descending).

    Raises:
        HTTPException: If text not found.
    """
    cached = cache.get(text_id)
    if not cached:
        raise HTTPException(status_code=404, detail=f"Text '{text_id}' not found")

    frequencies = [
        WordFrequency(word=word, count=count)
        for word, count in cached.frequencies.most_common()
    ]

    return FrequencyResponse(
        text_id=text_id,
        title=cached.title,
        total_words=sum(cached.frequencies.values()),
        unique_words=len(cached.frequencies),
        frequencies=frequencies,
    )


@app.get("/texts/{text_id}/zipf", response_model=ZipfResponse)
async def get_zipf(text_id: str) -> ZipfResponse:
    """Get Zipf analysis for a text.

    Computes word ranks and expected frequencies based on Zipf's law:
    f(r) = C / r, where C is the frequency of the most common word.

    Args:
        text_id: The text identifier

    Returns:
        Zipf analysis with actual and expected frequencies.

    Raises:
        HTTPException: If text not found.
    """
    cached = cache.get(text_id)
    if not cached:
        raise HTTPException(status_code=404, detail=f"Text '{text_id}' not found")

    zipf_constant = compute_zipf_constant(cached.frequencies)
    total_words = sum(cached.frequencies.values())

    data = []
    for rank, (word, frequency) in enumerate(cached.frequencies.most_common(), start=1):
        expected = zipf_constant / rank if rank > 0 else 0
        data.append(ZipfDataPoint(
            rank=rank,
            word=word,
            frequency=frequency,
            expected_frequency=expected,
        ))

    return ZipfResponse(
        text_id=text_id,
        title=cached.title,
        total_words=total_words,
        zipf_constant=zipf_constant,
        data=data,
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
