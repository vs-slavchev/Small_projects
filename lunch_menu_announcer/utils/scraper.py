"""Web scraping for the lunch menu site.

Assumptions about obednomenu.stariachinar.com:
- Day tabs exist for each weekday (Monday-Friday).
- Menu content may be rendered by JavaScript, so Playwright is the primary path.
- If the page already contains Bulgarian price text on a static GET, we skip Playwright.
- The active day tab is either auto-selected (check for .active/.today) or must be
  clicked by matching the Bulgarian weekday name.
"""

import re
import logging
from datetime import date

import requests
from bs4 import BeautifulSoup

log = logging.getLogger(__name__)

# Bulgarian weekday names (Monday=0 through Sunday=6)
_WEEKDAY_BG: dict[int, str] = {
    0: "Понеделник",
    1: "Вторник",
    2: "Сряда",
    3: "Четвъртък",
    4: "Петък",
    5: "Събота",
    6: "Неделя",
}

_CONTENT_SIGNALS = ("лв.", "€")
_MIN_CONTENT_LENGTH = 5_000


def fetch_menu_html(url: str, today: date) -> str | None:
    """Return raw HTML for today's menu.

    Tries a plain HTTP GET first; falls back to Playwright if the response
    lacks rendered menu content.
    """
    html = _static_fetch(url)
    if html and _content_loaded(html):
        log.info("Menu content obtained via static HTTP request.")
        return html

    log.info("Static fetch lacks menu content; switching to Playwright.")
    return _playwright_fetch(url, today)


def extract_full_menu_text(html: str) -> str:
    """Return cleaned, line-by-line text of the menu section."""
    soup = BeautifulSoup(html, "lxml")

    for tag in soup(["script", "style", "noscript", "meta", "link"]):
        tag.decompose()

    # Prefer a semantically identifiable menu container
    container = (
        soup.find(class_=re.compile(r"menu|lunch|content|main.content", re.I))
        or soup.find("main")
        or soup.find("article")
        or soup.body
    )

    raw = container.get_text(separator="\n") if container else soup.get_text(separator="\n")
    lines = [ln.strip() for ln in raw.splitlines()]
    return "\n".join(ln for ln in lines if ln)


# ── Internal helpers ────────────────────────────────────────────────────────────

def _static_fetch(url: str) -> str | None:
    try:
        r = requests.get(url, timeout=15, headers={"User-Agent": "Mozilla/5.0"})
        r.raise_for_status()
        r.encoding = "utf-8"
        return r.text
    except requests.RequestException as exc:
        log.warning("Static fetch failed: %s", exc)
        return None


def _content_loaded(html: str) -> bool:
    """True when the HTML contains actual rendered menu content."""
    return (
        any(signal in html for signal in _CONTENT_SIGNALS)
        and len(html) > _MIN_CONTENT_LENGTH
    )


def _playwright_fetch(url: str, today: date) -> str | None:
    try:
        from playwright.sync_api import sync_playwright  # type: ignore[import]
    except ImportError:
        log.error(
            "Playwright is not installed.\n"
            "Run: pip install playwright && playwright install chromium"
        )
        return None

    weekday_name = _WEEKDAY_BG.get(today.weekday(), "")
    log.info("Target day tab: %r (weekday index %d)", weekday_name, today.weekday())

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        try:
            page = browser.new_page()
            page.goto(url, wait_until="domcontentloaded", timeout=30_000)
            page.wait_for_timeout(2_000)  # let initial JS settle

            _click_today_tab(page, today.weekday(), weekday_name)

            # Confirm menu content is visible
            try:
                page.wait_for_selector("text=лв.", timeout=10_000)
            except Exception:
                log.warning("Timed out waiting for price text; proceeding anyway.")

            return page.content()
        except Exception as exc:
            log.error("Playwright fetch error: %s", exc)
            return None
        finally:
            browser.close()


def _click_today_tab(page, weekday_idx: int, weekday_name: str) -> None:
    """Click the weekday tab for today using several fallback strategies."""
    # Strategy 1: site already highlights today's tab automatically
    for selector in (".active", ".today", "[aria-selected='true']", ".current"):
        try:
            if page.query_selector(selector):
                log.info("Today's tab already active (matched '%s').", selector)
                return
        except Exception:
            pass

    # Strategy 2: click by visible Bulgarian weekday text
    if weekday_name:
        try:
            locator = page.get_by_text(weekday_name, exact=False)
            if locator.count() > 0:
                locator.first.click(timeout=5_000)
                page.wait_for_timeout(1_500)
                log.info("Clicked tab by text: %r", weekday_name)
                return
        except Exception:
            pass

    # Strategy 3: data-attribute or positional selectors
    candidate_selectors = [
        f"[data-day='{weekday_idx}']",
        f"[data-weekday='{weekday_idx}']",
        f"[data-index='{weekday_idx}']",
        f".day-tab:nth-child({weekday_idx + 1})",
        f".nav-item:nth-child({weekday_idx + 1})",
        f"li:nth-child({weekday_idx + 1}) a",
    ]
    for selector in candidate_selectors:
        try:
            page.click(selector, timeout=2_000)
            page.wait_for_timeout(1_500)
            log.info("Clicked tab via selector: %s", selector)
            return
        except Exception:
            continue

    log.warning(
        "Could not identify today's tab; using whatever is currently visible."
    )
