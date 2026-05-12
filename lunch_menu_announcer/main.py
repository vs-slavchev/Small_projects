#!/usr/bin/env python3
"""Lunch Menu Announcer - crawls today's lunch menu and generates audio."""

import sys
import logging
from datetime import date
from pathlib import Path

from utils.scraper import fetch_menu_html, extract_full_menu_text
from utils.parser import parse_meal_names
from utils.tts import generate_audio
from utils.archive import save_archive

# ── Configuration ──────────────────────────────────────────────────────────────
MENU_URL: str = "https://obednomenu.stariachinar.com/sofia/"
VOICE_SAMPLE: Path = Path("voice/sample.wav")
ARCHIVE_DIR: Path = Path("archive")
OUTPUT_DIR: Path = Path("output")
TTS_MODEL: str = "tts_models/multilingual/multi-dataset/xtts_v2"
LANGUAGE: str = "bg"
# ───────────────────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)


def main() -> int:
    today = date.today()
    date_str = today.strftime("%Y-%m-%d")

    ARCHIVE_DIR.mkdir(exist_ok=True)
    OUTPUT_DIR.mkdir(exist_ok=True)

    log.info("Fetching menu from %s", MENU_URL)
    html = fetch_menu_html(MENU_URL, today)
    if html is None:
        log.error(
            "Failed to fetch menu HTML — check your internet connection "
            "or inspect %s manually.",
            MENU_URL,
        )
        return 1

    full_text = extract_full_menu_text(html)
    if not full_text.strip():
        log.error("Extracted menu text is empty.")
        dump_path = ARCHIVE_DIR / f"{date_str}_debug.html"
        dump_path.write_text(html, encoding="utf-8")
        log.info("HTML debug dump saved to %s", dump_path)
        return 1

    archive_path = ARCHIVE_DIR / f"{date_str}.txt"
    save_archive(full_text, archive_path)
    log.info("Full menu text archived to %s", archive_path)

    meals = parse_meal_names(full_text)
    if not meals:
        log.error("No meal names could be parsed from the menu text.")
        return 1

    print("\nToday's meals:")
    for meal in meals:
        print(f"  - {meal}")

    speech_text = ", ".join(meals)

    if not VOICE_SAMPLE.exists():
        log.error(
            "Voice sample not found at %s\n"
            "Please place a short WAV recording there and re-run.",
            VOICE_SAMPLE,
        )
        return 1

    output_path = OUTPUT_DIR / f"{date_str}.wav"
    log.info("Generating audio with model %s ...", TTS_MODEL)
    try:
        generate_audio(speech_text, VOICE_SAMPLE, output_path, TTS_MODEL, LANGUAGE)
    except RuntimeError as exc:
        log.error("%s", exc)
        return 1

    print(f"\nDone!")
    print(f"  Archive : {archive_path}")
    print(f"  Audio   : {output_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
