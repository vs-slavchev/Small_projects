"""Parse meal names from raw menu text.

Filtering rules:
  - Discard lines containing price tokens (€, лв., EUR, BGN)
  - Discard lines that are only numbers / gram measurements
  - Discard category headers (all-uppercase Cyrillic/Latin, or ending with гр.)
  - Keep everything else as a meal name
"""

import re
import logging

log = logging.getLogger(__name__)

# Lines containing currency symbols or price text
_PRICE_RE = re.compile(r"[€$]|лв\.|\bEUR\b|\bBGN\b", re.IGNORECASE)

# Lines that are purely a number with optional gram suffix  e.g. "250 гр."
_GRAMS_ONLY_RE = re.compile(
    r"^\d+[\.,]?\d*\s*(гр\.?|g\.?)?$", re.IGNORECASE | re.UNICODE
)


def parse_meal_names(text: str) -> list[str]:
    """Return a list of meal names extracted from *text*."""
    meals: list[str] = []
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        if _PRICE_RE.search(line):
            continue
        if _GRAMS_ONLY_RE.match(line):
            continue
        if _is_header(line):
            continue
        meals.append(line)

    log.debug("Extracted %d meals from %d lines of text", len(meals), len(text.splitlines()))
    return meals


def _is_header(line: str) -> bool:
    """Return True when the line looks like a category/section header."""
    # Entirely uppercase (Cyrillic А-Я + Latin A-Z), spaces, digits, punctuation
    if re.match(r"^[А-ЯA-Z\s\d\.\-/,]+$", line, re.UNICODE) and len(line) < 80:
        return True
    # Ends with a gram value: "СУПА 300 гр."
    if re.search(r"\d+\s*гр\.?$", line, re.IGNORECASE | re.UNICODE):
        return True
    return False
