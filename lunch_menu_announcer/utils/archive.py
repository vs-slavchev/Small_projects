"""Archive helpers."""

from pathlib import Path


def save_archive(text: str, path: Path) -> None:
    """Write *text* to *path* with UTF-8 encoding."""
    path.write_text(text, encoding="utf-8")
