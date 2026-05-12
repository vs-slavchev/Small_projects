# Lunch Menu Announcer

A Python terminal application that:
1. Crawls today's lunch menu from [obednomenu.stariachinar.com/sofia](https://obednomenu.stariachinar.com/sofia/)
2. Parses out only the meal names (no prices, weights, or headers)
3. Generates a Bulgarian speech audio file using Coqui XTTS v2 (fully offline)

## Project structure

```
lunch_menu_announcer/
├── main.py              # entry point
├── requirements.txt
├── archive/             # raw menu text per day  (YYYY-MM-DD.txt)
├── output/              # generated audio files  (YYYY-MM-DD.wav)
├── voice/
│   └── sample.wav       # your voice sample (add manually)
└── utils/
    ├── scraper.py       # fetch_menu_html(), extract_full_menu_text()
    ├── parser.py        # parse_meal_names()
    ├── tts.py           # generate_audio()
    └── archive.py       # save_archive()
```

## Requirements

- Python 3.11+
- Linux (tested) / macOS
- Internet access for the first XTTS model download (~2 GB)

## Setup

```bash
# 1. Create and activate a virtual environment
python3 -m venv .venv
source .venv/bin/activate

# 2. Install Python dependencies
pip install -r requirements.txt

# 3. Install the Playwright browser (Chromium only is enough)
playwright install chromium

# 4. Add your voice sample
#    Place a 6-30 second WAV recording at:
#      voice/sample.wav
```

## Usage

```bash
python main.py
```

### Example terminal output

```
10:30:01  INFO     Fetching menu from https://obednomenu.stariachinar.com/sofia/
10:30:02  INFO     Static fetch lacks menu content; switching to Playwright.
10:30:04  INFO     Target day tab: 'Вторник' (weekday index 1)
10:30:05  INFO     Clicked tab by text: 'Вторник'
10:30:06  INFO     Full menu text archived to archive/2026-05-12.txt

Today's meals:
  - Градинарска салата
  - Таратор
  - Доматена с фиде
  - Пилешко с ориз
  - Пълнени чушки

10:30:06  INFO     Generating audio with model tts_models/multilingual/multi-dataset/xtts_v2 ...
10:30:06  INFO     Loading TTS model: tts_models/multilingual/multi-dataset/xtts_v2
10:30:06  INFO     (First run will download ~2 GB — subsequent runs use the cache.)
10:30:45  INFO     Audio written to output/2026-05-12.wav

Done!
  Archive : archive/2026-05-12.txt
  Audio   : output/2026-05-12.wav
```

## Configuration

All tunable constants live at the top of `main.py`:

| Constant | Default | Description |
|---|---|---|
| `MENU_URL` | `https://obednomenu.stariachinar.com/sofia/` | Menu source URL |
| `VOICE_SAMPLE` | `voice/sample.wav` | Voice cloning reference |
| `ARCHIVE_DIR` | `archive/` | Where to save raw text |
| `OUTPUT_DIR` | `output/` | Where to save audio |
| `TTS_MODEL` | `tts_models/multilingual/multi-dataset/xtts_v2` | Coqui model |
| `LANGUAGE` | `bg` | TTS language code |

## How scraping works

1. **Static fetch first** — tries a plain `requests.get()`. If the response already contains Bulgarian price text (`лв.` / `€`) the site is serving static content and Playwright is skipped.
2. **Playwright fallback** — launches a headless Chromium browser, waits for JS to render, then tries to click today's weekday tab via:
   - CSS class detection (`.active`, `.today`, `[aria-selected]`)
   - Visible Bulgarian text (`Понеделник`, `Вторник`, …)
   - Data-attribute selectors (`data-day`, `data-weekday`, `data-index`)
   - Positional selectors (`:nth-child`)

If a fetch still returns empty content a debug HTML dump is saved to `archive/YYYY-MM-DD_debug.html`.

## Parsing rules

A line is kept as a meal name **only if** it does **not** match any of these patterns:

| Pattern | Example discarded |
|---|---|
| Contains `€` or `лв.` | `5.18 € / 10.13 лв.` |
| Pure number ± gram suffix | `250 гр.`, `300` |
| All-uppercase Cyrillic/Latin | `САЛАТА`, `ОСНОВНО ЯСТИЕ` |
| Uppercase ending with grams | `СУПА 300 гр.` |

## Troubleshooting

### Playwright

**`playwright install` fails behind a corporate proxy**
```bash
HTTPS_PROXY=http://proxy:3128 playwright install chromium
```

**Headless browser not found**
```bash
# Re-run the install command explicitly
playwright install chromium
# Verify:
python -c "from playwright.sync_api import sync_playwright; print('OK')"
```

**Menu tab not found / wrong day selected**
- Open `archive/YYYY-MM-DD_debug.html` in a browser and inspect the day tab markup.
- Update `_click_today_tab()` in `utils/scraper.py` with the correct selector.

### Coqui XTTS v2

**First run is slow** — the model (~2 GB) downloads to `~/.local/share/tts/` and is cached for all subsequent runs.

**CUDA / GPU** — XTTS auto-detects a CUDA GPU if available. No extra configuration needed; CPU inference works but is slower (~1-2 min for a short sentence list).

**`RuntimeError: CUDA out of memory`**
```bash
# Force CPU inference
CUDA_VISIBLE_DEVICES="" python main.py
```

**`voice/sample.wav` requirements not met**
- Must be a WAV file (not MP3)
- At least 6 seconds of clean speech
- Resample to 22050 Hz if XTTS complains:
```bash
ffmpeg -i original.wav -ar 22050 voice/sample.wav
```

**Bulgarian text sounds wrong** — ensure `LANGUAGE = "bg"` in `main.py` and that the meal names are in proper Unicode Bulgarian (Cyrillic), not transliterated Latin.
