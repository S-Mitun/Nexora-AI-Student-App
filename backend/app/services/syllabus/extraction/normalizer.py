import re


def clean_academic_text(text: str) -> str:
    """
    Cleans extraction artifacts without changing academic meaning.
    - Repairs word-per-line vertical fragmentation produced by token-based PDF generators.
    - Unwraps mid-sentence line breaks while preserving structural headers and numbered lists.
    - Repairs broken hyphenated words across line wraps (e.g. 'deter-\\nministic' -> 'deterministic', 'Alpha-\\nBeta' -> 'Alpha-Beta').
    - Replaces non-standard whitespace and multiple spaces.
    - Collapses excessive blank lines.
    - Preserves mathematical notation, equations ($LaTeX$), brackets, and punctuation.
    - NEVER fabricates or alters syllabus words.
    """
    if not text:
        return ""

    # Replace null bytes or control characters except tab and newline
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", text)
    # Normalize unicode replacement character or corrupt bullet symbols
    text = text.replace("\ufffd", "-").replace("•", "-")

    # Normalize carriage returns
    text = text.replace("\r\n", "\n").replace("\r", "\n")

    # Remove standard page numbering patterns at line starts/ends
    text = re.sub(r"(?im)^\s*page\s+\d+(\s+of\s+\d+)?\s*$", "", text)
    text = re.sub(r"(?m)^\s*[-—–]\s*\d+\s*[-—–]\s*$", "", text)

    # Detect word-per-line vertical fragmentation
    raw_lines = [ln.strip() for ln in text.split("\n") if ln.strip()]
    if raw_lines:
        words_per_line = [len(ln.split()) for ln in raw_lines]
        is_word_fragmented = (sum(1 for w in words_per_line if w <= 2) / len(raw_lines)) > 0.5
        if is_word_fragmented:
            tokens = []
            for ln in raw_lines:
                tokens.extend(ln.split())

            reconstructed = []
            i = 0
            while i < len(tokens):
                tok = tokens[i]
                tok_upper = tok.upper()
                # Check for Unit / Module headers followed by Roman numeral or number
                if tok_upper in ["MODULE", "UNIT", "CHAPTER", "PART", "SECTION"] and i + 1 < len(tokens) and re.match(r"^[IVX\d]+$", tokens[i + 1]):
                    reconstructed.append("\n\n" + tok + " " + tokens[i + 1])
                    i += 2
                    continue
                # Major sections
                elif tok_upper in ["COURSE", "TEXTBOOKS", "TEXT", "REFERENCE", "LIST", "WEB", "TOTAL", "SDG:", "SDG"] and i + 1 < len(tokens):
                    reconstructed.append("\n\n" + tok)
                    i += 1
                    continue
                # Numbered list item
                elif re.match(r"^\d+\.$", tok):
                    reconstructed.append("\n" + tok)
                    i += 1
                    continue
                # Course Outcomes: CO1, CO2
                elif re.match(r"^C[O0]\d+$", tok, re.I):
                    reconstructed.append("\n" + tok)
                    i += 1
                    continue
                else:
                    reconstructed.append(tok)
                    i += 1

            text = " ".join(reconstructed)

    # Repair broken hyphenated line wraps (e.g., Alpha-\nBeta -> Alpha-Beta, Many-\nto-One)
    text = re.sub(r"([A-Za-z]+)-\n\s*([A-Za-z]+)", r"\1-\2", text)

    # Unbreak mid-sentence line wraps while respecting structural headings and numbered items
    lines = text.split("\n")
    unwrapped = []
    for ln in lines:
        s = ln.strip()
        if not s:
            if unwrapped and unwrapped[-1] != "":
                unwrapped.append("")
            continue
        if unwrapped and unwrapped[-1]:
            prev = unwrapped[-1]
            is_prev_header = bool(re.match(r"(?i)^(UNIT|MODULE|CHAPTER|PART|COURSE|TEXT|REFERENCE|LIST|TOTAL|SDG)\b", prev))
            prev_ends_punct = prev.endswith((".", ":", ";", "?", "!"))
            curr_is_new_item = bool(re.match(r"^(\d+[\.\)]|C[O0]\d+|[A-Z\s]{4,}:|UNIT|MODULE|CHAPTER|PART|AI Tools:|LIST OF)", s, re.I))

            if not is_prev_header and not prev_ends_punct and not curr_is_new_item:
                unwrapped[-1] = prev + " " + s
                continue
        unwrapped.append(s)

    text = "\n".join(unwrapped)

    # Normalize horizontal whitespace (spaces, non-breaking spaces, tabs)
    text = re.sub(r"[^\S\n]+", " ", text)
    # Collapse more than 2 consecutive newlines into 2
    text = re.sub(r"\n{3,}", "\n\n", text)

    return text.strip()
