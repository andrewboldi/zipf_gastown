#!/usr/bin/env python3
"""
Download Project Gutenberg corpus for Zipf's law analysis.

Usage:
    python scripts/download_corpus.py
    python scripts/download_corpus.py --target-size 1.0  # Download 1GB
    python scripts/download_corpus.py --max-concurrent 10  # Faster downloads
"""

import asyncio
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from app.gutenberg import GutenbergDownloader, main

if __name__ == "__main__":
    asyncio.run(main())
