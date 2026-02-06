"""
Project Gutenberg corpus downloader.

Downloads texts from Project Gutenberg for Zipf's law analysis.
Targets ~2-3GB of diverse texts: classic literature, plays, poetry.
"""

import asyncio
import json
import logging
import os
import re
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Optional

import aiohttp

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Project Gutenberg mirror URLs
GUTENBERG_MIRROR = "https://www.gutenberg.org/cache/epub"
GUTENBERG_TXT_MIRROR = "https://www.gutenberg.org/files"

# Target corpus size in bytes (2-3GB)
TARGET_SIZE_MIN = 2 * 1024 * 1024 * 1024  # 2GB
TARGET_SIZE_MAX = 3 * 1024 * 1024 * 1024  # 3GB

# Default data directory
DEFAULT_DATA_DIR = Path(__file__).parent.parent.parent / "data"


@dataclass
class TextMetadata:
    """Metadata for a downloaded text."""
    id: int
    title: str
    author: str
    genre: str
    language: str
    size_bytes: int
    filename: str
    download_url: str


# Curated list of Project Gutenberg texts by genre
# Format: (id, title, author, genre)
CURATED_TEXTS = [
    # Classic Literature - Novels
    (1342, "Pride and Prejudice", "Jane Austen", "classic_literature"),
    (11, "Alice's Adventures in Wonderland", "Lewis Carroll", "classic_literature"),
    (84, "Frankenstein", "Mary Shelley", "classic_literature"),
    (1661, "The Adventures of Sherlock Holmes", "Arthur Conan Doyle", "classic_literature"),
    (98, "A Tale of Two Cities", "Charles Dickens", "classic_literature"),
    (1400, "Great Expectations", "Charles Dickens", "classic_literature"),
    (46, "A Christmas Carol", "Charles Dickens", "classic_literature"),
    (174, "The Picture of Dorian Gray", "Oscar Wilde", "classic_literature"),
    (76, "Adventures of Huckleberry Finn", "Mark Twain", "classic_literature"),
    (74, "The Adventures of Tom Sawyer", "Mark Twain", "classic_literature"),
    (2701, "Moby Dick", "Herman Melville", "classic_literature"),
    (1232, "The Prince", "Niccolò Machiavelli", "classic_literature"),
    (158, "Emma", "Jane Austen", "classic_literature"),
    (161, "Sense and Sensibility", "Jane Austen", "classic_literature"),
    (1260, "Jane Eyre", "Charlotte Brontë", "classic_literature"),
    (768, "Wuthering Heights", "Emily Brontë", "classic_literature"),
    (345, "Dracula", "Bram Stoker", "classic_literature"),
    (120, "Treasure Island", "Robert Louis Stevenson", "classic_literature"),
    (43, "The Strange Case of Dr. Jekyll and Mr. Hyde", "Robert Louis Stevenson", "classic_literature"),
    (1080, "A Modest Proposal", "Jonathan Swift", "classic_literature"),
    (829, "Gulliver's Travels", "Jonathan Swift", "classic_literature"),
    (730, "Oliver Twist", "Charles Dickens", "classic_literature"),
    (766, "David Copperfield", "Charles Dickens", "classic_literature"),
    (580, "The Pickwick Papers", "Charles Dickens", "classic_literature"),
    (883, "Bleak House", "Charles Dickens", "classic_literature"),
    (35, "The Time Machine", "H.G. Wells", "classic_literature"),
    (36, "The War of the Worlds", "H.G. Wells", "classic_literature"),
    (5230, "The Invisible Man", "H.G. Wells", "classic_literature"),
    (159, "The Island of Doctor Moreau", "H.G. Wells", "classic_literature"),
    (64317, "The Great Gatsby", "F. Scott Fitzgerald", "classic_literature"),
    (1184, "The Count of Monte Cristo", "Alexandre Dumas", "classic_literature"),
    (1259, "Twenty Thousand Leagues Under the Sea", "Jules Verne", "classic_literature"),
    (103, "Around the World in Eighty Days", "Jules Verne", "classic_literature"),
    (18857, "Journey to the Center of the Earth", "Jules Verne", "classic_literature"),
    (2500, "Siddhartha", "Hermann Hesse", "classic_literature"),
    (215, "The Call of the Wild", "Jack London", "classic_literature"),
    (910, "White Fang", "Jack London", "classic_literature"),
    (600, "Notes from the Underground", "Fyodor Dostoevsky", "classic_literature"),
    (2554, "Crime and Punishment", "Fyodor Dostoevsky", "classic_literature"),
    (28054, "The Brothers Karamazov", "Fyodor Dostoevsky", "classic_literature"),
    (2600, "War and Peace", "Leo Tolstoy", "classic_literature"),
    (1399, "Anna Karenina", "Leo Tolstoy", "classic_literature"),
    (996, "Don Quixote", "Miguel de Cervantes", "classic_literature"),
    (244, "A Study in Scarlet", "Arthur Conan Doyle", "classic_literature"),
    (2852, "The Hound of the Baskervilles", "Arthur Conan Doyle", "classic_literature"),
    (3289, "The Sign of the Four", "Arthur Conan Doyle", "classic_literature"),
    (1952, "The Yellow Wallpaper", "Charlotte Perkins Gilman", "classic_literature"),
    (209, "The Turn of the Screw", "Henry James", "classic_literature"),
    (432, "The Portrait of a Lady", "Henry James", "classic_literature"),
    (4300, "Ulysses", "James Joyce", "classic_literature"),
    (2814, "Dubliners", "James Joyce", "classic_literature"),
    (4217, "A Portrait of the Artist as a Young Man", "James Joyce", "classic_literature"),
    (5200, "Metamorphosis", "Franz Kafka", "classic_literature"),
    (7849, "The Trial", "Franz Kafka", "classic_literature"),
    (113, "The Secret Garden", "Frances Hodgson Burnett", "classic_literature"),
    (479, "Little Women", "Louisa May Alcott", "classic_literature"),
    (514, "Little Men", "Louisa May Alcott", "classic_literature"),
    (1164, "The Wonderful Wizard of Oz", "L. Frank Baum", "classic_literature"),
    (45, "Anne of Green Gables", "L.M. Montgomery", "classic_literature"),
    (47, "Anne of Avonlea", "L.M. Montgomery", "classic_literature"),
    (3825, "Pygmalion", "George Bernard Shaw", "classic_literature"),
    (25344, "The Scarlet Letter", "Nathaniel Hawthorne", "classic_literature"),
    (77, "The House of the Seven Gables", "Nathaniel Hawthorne", "classic_literature"),

    # Plays / Drama
    (1524, "Hamlet", "William Shakespeare", "plays"),
    (1533, "Macbeth", "William Shakespeare", "plays"),
    (1531, "Romeo and Juliet", "William Shakespeare", "plays"),
    (1532, "King Lear", "William Shakespeare", "plays"),
    (1526, "Othello", "William Shakespeare", "plays"),
    (1519, "The Merchant of Venice", "William Shakespeare", "plays"),
    (1508, "The Tempest", "William Shakespeare", "plays"),
    (1515, "A Midsummer Night's Dream", "William Shakespeare", "plays"),
    (1513, "Much Ado About Nothing", "William Shakespeare", "plays"),
    (1110, "The Taming of the Shrew", "William Shakespeare", "plays"),
    (2243, "Twelfth Night", "William Shakespeare", "plays"),
    (23042, "Julius Caesar", "William Shakespeare", "plays"),
    (2267, "Richard III", "William Shakespeare", "plays"),
    (2260, "Henry V", "William Shakespeare", "plays"),
    (2264, "The Comedy of Errors", "William Shakespeare", "plays"),
    (2237, "As You Like It", "William Shakespeare", "plays"),
    (1539, "The Merry Wives of Windsor", "William Shakespeare", "plays"),
    (1511, "Antony and Cleopatra", "William Shakespeare", "plays"),
    (1522, "Coriolanus", "William Shakespeare", "plays"),
    (1520, "Pericles", "William Shakespeare", "plays"),
    (1523, "Timon of Athens", "William Shakespeare", "plays"),
    (1525, "Titus Andronicus", "William Shakespeare", "plays"),
    (1529, "Cymbeline", "William Shakespeare", "plays"),
    (1534, "The Winter's Tale", "William Shakespeare", "plays"),
    (1521, "Measure for Measure", "William Shakespeare", "plays"),
    (2270, "Henry IV, Part 1", "William Shakespeare", "plays"),
    (2271, "Henry IV, Part 2", "William Shakespeare", "plays"),
    (1528, "Troilus and Cressida", "William Shakespeare", "plays"),
    (2251, "All's Well That Ends Well", "William Shakespeare", "plays"),
    (4970, "An Ideal Husband", "Oscar Wilde", "plays"),
    (844, "The Importance of Being Earnest", "Oscar Wilde", "plays"),
    (790, "Lady Windermere's Fan", "Oscar Wilde", "plays"),
    (921, "A Woman of No Importance", "Oscar Wilde", "plays"),
    (3250, "Salome", "Oscar Wilde", "plays"),
    (3034, "Oedipus the King", "Sophocles", "plays"),
    (1555, "Prometheus Bound", "Aeschylus", "plays"),
    (1658, "The Frogs", "Aristophanes", "plays"),
    (7700, "Medea", "Euripides", "plays"),
    (779, "Doctor Faustus", "Christopher Marlowe", "plays"),
    (1604, "Edward II", "Christopher Marlowe", "plays"),
    (10616, "A Doll's House", "Henrik Ibsen", "plays"),
    (4769, "An Enemy of the People", "Henrik Ibsen", "plays"),
    (2296, "Hedda Gabler", "Henrik Ibsen", "plays"),
    (4093, "Ghosts", "Henrik Ibsen", "plays"),
    (1754, "The Wild Duck", "Henrik Ibsen", "plays"),
    (8121, "The Cherry Orchard", "Anton Chekhov", "plays"),
    (7986, "The Seagull", "Anton Chekhov", "plays"),
    (7985, "Three Sisters", "Anton Chekhov", "plays"),
    (1753, "Uncle Vanya", "Anton Chekhov", "plays"),
    (7833, "The Lower Depths", "Maxim Gorky", "plays"),

    # Poetry
    (1321, "Paradise Lost", "John Milton", "poetry"),
    (1268, "The Divine Comedy", "Dante Alighieri", "poetry"),
    (1129, "The Iliad", "Homer", "poetry"),
    (1727, "The Odyssey", "Homer", "poetry"),
    (2680, "Leaves of Grass", "Walt Whitman", "poetry"),
    (10, "The King James Bible", "Various", "poetry"),
    (12, "Through the Looking-Glass", "Lewis Carroll", "poetry"),
    (23, "Narrative of the Life of Frederick Douglass", "Frederick Douglass", "poetry"),
    (1065, "The Raven", "Edgar Allan Poe", "poetry"),
    (2147, "The Complete Works of Edgar Allan Poe", "Edgar Allan Poe", "poetry"),
    (10031, "A Shropshire Lad", "A. E. Housman", "poetry"),
    (7370, "Sonnets from the Portuguese", "Elizabeth Barrett Browning", "poetry"),
    (2490, "The Sonnets", "William Shakespeare", "poetry"),
    (8800, "The Complete Works of Percy Bysshe Shelley", "Percy Bysshe Shelley", "poetry"),
    (4705, "Poems", "John Keats", "poetry"),
    (8604, "The Collected Poems of William Butler Yeats", "W. B. Yeats", "poetry"),
    (22579, "Songs of Innocence and of Experience", "William Blake", "poetry"),
    (574, "Beowulf", "Unknown", "poetry"),
    (145, "Middlemarch", "George Eliot", "classic_literature"),
    (9296, "The Faerie Queene", "Edmund Spenser", "poetry"),
    (16389, "The Canterbury Tales", "Geoffrey Chaucer", "poetry"),
    (3160, "The Waste Land", "T. S. Eliot", "poetry"),
    (25305, "Songs of Experience", "William Blake", "poetry"),
    (51060, "Selected Poems of Emily Dickinson", "Emily Dickinson", "poetry"),
    (12242, "Poems", "Emily Dickinson", "poetry"),
    (2678, "Poems", "Robert Burns", "poetry"),
    (4800, "Poems", "John Donne", "poetry"),
    (2161, "Poems of William Wordsworth", "William Wordsworth", "poetry"),
    (17192, "Ode on a Grecian Urn and Other Poems", "John Keats", "poetry"),
    (24269, "The Rubaiyat of Omar Khayyam", "Omar Khayyam", "poetry"),
    (14082, "Aeneid", "Virgil", "poetry"),
    (21765, "The Metamorphoses", "Ovid", "poetry"),

    # Additional longer works to reach 2-3GB target
    (135, "Les Misérables", "Victor Hugo", "classic_literature"),
    (5827, "The Hunchback of Notre Dame", "Victor Hugo", "classic_literature"),
    (21374, "The Man Who Laughs", "Victor Hugo", "classic_literature"),
    (3610, "The Toilers of the Sea", "Victor Hugo", "classic_literature"),
    (16, "Peter Pan", "J.M. Barrie", "classic_literature"),
    (19942, "Candide", "Voltaire", "classic_literature"),
    (3207, "Leviathan", "Thomas Hobbes", "classic_literature"),
    (4280, "The Republic", "Plato", "classic_literature"),
    (1497, "The Complete Works of Plato", "Plato", "classic_literature"),
    (2381, "Meditations", "Marcus Aurelius", "classic_literature"),
    (5669, "The Art of War", "Sun Tzu", "classic_literature"),
    (22381, "Critique of Pure Reason", "Immanuel Kant", "classic_literature"),
    (38427, "Thus Spoke Zarathustra", "Friedrich Nietzsche", "classic_literature"),
    (7205, "Beyond Good and Evil", "Friedrich Nietzsche", "classic_literature"),
    (100, "The Complete Works of William Shakespeare", "William Shakespeare", "plays"),
]


class GutenbergDownloader:
    """Downloads texts from Project Gutenberg."""

    def __init__(
        self,
        data_dir: Path = DEFAULT_DATA_DIR,
        max_concurrent: int = 5
    ):
        self.data_dir = Path(data_dir)
        self.raw_dir = self.data_dir / "raw"
        self.metadata_file = self.data_dir / "metadata.json"
        self.max_concurrent = max_concurrent
        self.metadata: list[TextMetadata] = []
        self.total_size = 0

        # Create directories
        self.raw_dir.mkdir(parents=True, exist_ok=True)

        # Create genre subdirectories
        for _, _, _, genre in CURATED_TEXTS:
            (self.raw_dir / genre).mkdir(exist_ok=True)

    def _get_download_url(self, book_id: int) -> str:
        """Get the download URL for a book."""
        # Try the EPUB cache first (more reliable)
        return f"{GUTENBERG_MIRROR}/{book_id}/pg{book_id}.txt"

    def _get_alternate_urls(self, book_id: int) -> list[str]:
        """Get alternate download URLs for a book."""
        return [
            f"{GUTENBERG_TXT_MIRROR}/{book_id}/{book_id}.txt",
            f"{GUTENBERG_TXT_MIRROR}/{book_id}/{book_id}-0.txt",
            f"{GUTENBERG_MIRROR}/{book_id}/pg{book_id}.txt.utf8",
        ]

    def _clean_text(self, text: str) -> str:
        """Remove Project Gutenberg header/footer boilerplate."""
        # Find the start of actual content
        start_markers = [
            "*** START OF THIS PROJECT GUTENBERG",
            "*** START OF THE PROJECT GUTENBERG",
            "*END*THE SMALL PRINT",
        ]

        end_markers = [
            "*** END OF THIS PROJECT GUTENBERG",
            "*** END OF THE PROJECT GUTENBERG",
            "End of Project Gutenberg",
            "End of the Project Gutenberg",
        ]

        start_pos = 0
        for marker in start_markers:
            pos = text.find(marker)
            if pos != -1:
                # Find the end of this line
                newline_pos = text.find("\n", pos)
                if newline_pos != -1:
                    start_pos = newline_pos + 1
                    break

        end_pos = len(text)
        for marker in end_markers:
            pos = text.find(marker)
            if pos != -1 and pos > start_pos:
                end_pos = pos
                break

        return text[start_pos:end_pos].strip()

    async def _download_single(
        self,
        session: aiohttp.ClientSession,
        book_id: int,
        title: str,
        author: str,
        genre: str
    ) -> Optional[TextMetadata]:
        """Download a single book."""
        # Check if already downloaded
        genre_dir = self.raw_dir / genre
        filename = f"{book_id}_{self._sanitize_filename(title)}.txt"
        filepath = genre_dir / filename

        if filepath.exists():
            size = filepath.stat().st_size
            logger.info(f"Already downloaded: {title} ({size:,} bytes)")
            return TextMetadata(
                id=book_id,
                title=title,
                author=author,
                genre=genre,
                language="en",
                size_bytes=size,
                filename=str(filepath.relative_to(self.data_dir)),
                download_url=self._get_download_url(book_id)
            )

        # Try primary URL first, then alternates
        urls = [self._get_download_url(book_id)] + self._get_alternate_urls(book_id)

        for url in urls:
            try:
                async with session.get(url, timeout=aiohttp.ClientTimeout(total=60)) as response:
                    if response.status == 200:
                        text = await response.text(errors="replace")

                        # Clean the text
                        cleaned_text = self._clean_text(text)

                        if len(cleaned_text) < 1000:
                            logger.warning(f"Text too short after cleaning: {title}")
                            continue

                        # Save the text
                        filepath.write_text(cleaned_text, encoding="utf-8")
                        size = filepath.stat().st_size

                        logger.info(f"Downloaded: {title} ({size:,} bytes)")

                        return TextMetadata(
                            id=book_id,
                            title=title,
                            author=author,
                            genre=genre,
                            language="en",
                            size_bytes=size,
                            filename=str(filepath.relative_to(self.data_dir)),
                            download_url=url
                        )
            except Exception as e:
                logger.debug(f"Failed to download from {url}: {e}")
                continue

        logger.warning(f"Failed to download: {title} (tried all URLs)")
        return None

    def _sanitize_filename(self, name: str) -> str:
        """Sanitize a string for use as a filename."""
        # Remove or replace invalid characters
        sanitized = re.sub(r'[<>:"/\\|?*]', '', name)
        sanitized = re.sub(r'\s+', '_', sanitized)
        sanitized = sanitized[:50]  # Limit length
        return sanitized

    async def download_corpus(
        self,
        target_size: int = TARGET_SIZE_MIN,
        texts: Optional[list[tuple]] = None
    ) -> list[TextMetadata]:
        """
        Download the corpus until target size is reached.

        Args:
            target_size: Target corpus size in bytes
            texts: Optional list of texts to download (uses CURATED_TEXTS by default)

        Returns:
            List of TextMetadata for downloaded texts
        """
        texts = texts or CURATED_TEXTS

        connector = aiohttp.TCPConnector(limit=self.max_concurrent)
        async with aiohttp.ClientSession(connector=connector) as session:
            # Create a semaphore to limit concurrent downloads
            semaphore = asyncio.Semaphore(self.max_concurrent)

            async def download_with_semaphore(text_info):
                async with semaphore:
                    book_id, title, author, genre = text_info
                    return await self._download_single(session, book_id, title, author, genre)

            # Download all texts concurrently
            tasks = [download_with_semaphore(text) for text in texts]
            results = await asyncio.gather(*tasks, return_exceptions=True)

            for result in results:
                if isinstance(result, TextMetadata):
                    self.metadata.append(result)
                    self.total_size += result.size_bytes
                elif isinstance(result, Exception):
                    logger.error(f"Download error: {result}")

        # Save metadata
        self._save_metadata()

        logger.info(f"Downloaded {len(self.metadata)} texts, total size: {self.total_size:,} bytes")
        return self.metadata

    def _save_metadata(self):
        """Save metadata to JSON file."""
        metadata_dict = {
            "total_texts": len(self.metadata),
            "total_size_bytes": self.total_size,
            "texts": [asdict(m) for m in self.metadata]
        }

        self.metadata_file.write_text(
            json.dumps(metadata_dict, indent=2),
            encoding="utf-8"
        )
        logger.info(f"Saved metadata to {self.metadata_file}")

    def get_stats(self) -> dict:
        """Get corpus statistics."""
        if not self.metadata:
            # Try to load from file
            if self.metadata_file.exists():
                data = json.loads(self.metadata_file.read_text())
                return {
                    "total_texts": data["total_texts"],
                    "total_size_bytes": data["total_size_bytes"],
                    "size_gb": data["total_size_bytes"] / (1024**3),
                    "by_genre": {}
                }

        by_genre = {}
        for m in self.metadata:
            if m.genre not in by_genre:
                by_genre[m.genre] = {"count": 0, "size_bytes": 0}
            by_genre[m.genre]["count"] += 1
            by_genre[m.genre]["size_bytes"] += m.size_bytes

        return {
            "total_texts": len(self.metadata),
            "total_size_bytes": self.total_size,
            "size_gb": self.total_size / (1024**3),
            "by_genre": by_genre
        }


async def main():
    """Main entry point for corpus download."""
    import argparse

    parser = argparse.ArgumentParser(description="Download Project Gutenberg corpus")
    parser.add_argument(
        "--data-dir",
        type=Path,
        default=DEFAULT_DATA_DIR,
        help="Data directory for storing texts"
    )
    parser.add_argument(
        "--max-concurrent",
        type=int,
        default=5,
        help="Maximum concurrent downloads"
    )
    parser.add_argument(
        "--target-size",
        type=float,
        default=2.0,
        help="Target corpus size in GB"
    )

    args = parser.parse_args()

    downloader = GutenbergDownloader(
        data_dir=args.data_dir,
        max_concurrent=args.max_concurrent
    )

    target_bytes = int(args.target_size * 1024**3)

    logger.info(f"Starting corpus download (target: {args.target_size}GB)")
    logger.info(f"Data directory: {args.data_dir}")

    await downloader.download_corpus(target_size=target_bytes)

    stats = downloader.get_stats()
    logger.info(f"Corpus statistics:")
    logger.info(f"  Total texts: {stats['total_texts']}")
    logger.info(f"  Total size: {stats['size_gb']:.2f} GB")

    if stats.get("by_genre"):
        logger.info("  By genre:")
        for genre, info in stats["by_genre"].items():
            logger.info(f"    {genre}: {info['count']} texts, {info['size_bytes'] / (1024**2):.1f} MB")


if __name__ == "__main__":
    asyncio.run(main())
