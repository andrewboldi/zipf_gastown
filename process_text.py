import json
import re
import os
from collections import Counter


def extract_gutenberg_text(text):
    """Extract main text content from Project Gutenberg files, removing headers/footers."""
    # Find the start marker
    start_markers = [
        "*** START OF THE PROJECT GUTENBERG EBOOK",
        "*** START OF THIS PROJECT GUTENBERG EBOOK",
        "*END*THE SMALL PRINT!",
    ]

    # Find the end marker
    end_markers = [
        "*** END OF THE PROJECT GUTENBERG EBOOK",
        "*** END OF THIS PROJECT GUTENBERG EBOOK",
        "End of Project Gutenberg",
    ]

    start_idx = 0
    for marker in start_markers:
        idx = text.find(marker)
        if idx != -1:
            start_idx = text.find("\n", idx) + 1
            break

    end_idx = len(text)
    for marker in end_markers:
        idx = text.find(marker)
        if idx != -1:
            end_idx = idx
            break

    return text[start_idx:end_idx]


def process_text(input_file, output_file):
    """
    Reads a text file, counts word frequencies, and saves the result as a JSON file.
    """
    with open(input_file, "r", encoding="utf-8") as f:
        text = f.read()

    # Extract main content (for Project Gutenberg files)
    text = extract_gutenberg_text(text)

    # Remove punctuation and convert to lowercase
    text = re.sub(r"[^\w\s]", "", text)
    words = text.lower().split()

    # Filter out empty strings and numbers-only words
    words = [w for w in words if w and not w.isdigit()]

    # Count word frequencies
    word_counts = Counter(words)

    # Sort the word counts by frequency in descending order
    sorted_word_counts = dict(
        sorted(word_counts.items(), key=lambda item: item[1], reverse=True)
    )

    # Calculate total words and unique words
    total_words = sum(sorted_word_counts.values())
    unique_words = len(sorted_word_counts)

    # Save the result as a JSON file with metadata
    result = {
        "total_words": total_words,
        "unique_words": unique_words,
        "frequencies": sorted_word_counts,
    }

    with open(output_file, "w") as f:
        json.dump(result, f, indent=2)

    return result


if __name__ == "__main__":
    # Process all texts in data directory
    data_dir = "data"
    texts = [
        ("moby_dick.txt", "moby_dick.json", "Moby Dick"),
        ("pride_and_prejudice.txt", "pride_and_prejudice.json", "Pride and Prejudice"),
        (
            "alice_wonderland.txt",
            "alice_wonderland.json",
            "Alice's Adventures in Wonderland",
        ),
    ]

    print("Processing texts...")
    for input_file, output_file, title in texts:
        input_path = os.path.join(data_dir, input_file)
        output_path = os.path.join(data_dir, output_file)

        if os.path.exists(input_path):
            result = process_text(input_path, output_path)
            print(
                f"✓ {title}: {result['total_words']:,} words, {result['unique_words']:,} unique"
            )
        else:
            print(f"✗ {title}: File not found ({input_path})")

    print("\nProcessing complete!")
