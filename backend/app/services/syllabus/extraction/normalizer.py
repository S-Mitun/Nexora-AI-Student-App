import re


def clean_academic_text(text: str) -> str:
    """
    Cleans extraction artifacts without changing academic meaning.
    - Repairs hyphenated words across line wraps (e.g. 'deter-\\nministic' -> 'deterministic')
    - Replaces non-standard whitespace and multiple spaces
    - Collapses excessive blank lines
    - Preserves mathematical notation, equations ($LaTeX$), brackets, and punctuation
    - NEVER fabricates or alters syllabus words
    """
    if not text:
        return ""

    # Replace null bytes or control characters except tab and newline
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", text)

    # Normalize carriage returns
    text = text.replace("\r\n", "\n").replace("\r", "\n")

    # Repair broken hyphenated line wraps: 'word-\npart' -> 'wordpart'
    text = re.sub(r"([A-Za-z]{2,})-\n([A-Za-z]{2,})", r"\1\2", text)

    # Remove standard page numbering patterns at line starts/ends (e.g., 'Page 1 of 6', '[1]')
    text = re.sub(r"(?im)^\s*page\s+\d+(\s+of\s+\d+)?\s*$", "", text)
    text = re.sub(r"(?m)^\s*[-—–]\s*\d+\s*[-—–]\s*$", "", text)

    # Normalize horizontal whitespace (spaces, non-breaking spaces, tabs)
    text = re.sub(r"[^\S\n]+", " ", text)

    # Collapse more than 2 consecutive newlines into 2
    text = re.sub(r"\n{3,}", "\n\n", text)

    return text.strip()
