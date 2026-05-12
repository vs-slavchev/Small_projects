"""Web scraping for the lunch menu site using Playwright.

The site (obednomenu.stariachinar.com) returns 403 to plain HTTP clients
because of a server-side host/IP allowlist. A real browser session via
Playwright bypasses this restriction.

Day tabs for weekdays exist on the page. The scraper:
  1. Loads the page and waits for JS to render.
  2. Detects whether today's tab is already active.
  3. If not, clicks it by Bulgarian weekday text or fallback selectors.
  4. Waits for price text to confirm the menu is visible.
"""

import re
import logging
from datetime import date

from bs4 import BeautifulSoup

log = logging.getLogger(__name__)

_WEEKDAY_BG: dict[int, str] = {
    0: "Понеделник",
    1: "Вторник",
    2: "Сряда",
    3: "Четвъртък",
    4: "Петък",
    5: "Събота",
    6: "Неделя",
}


def fetch_menu_html(url: str, today: date) -> str | None:
    """Return rendered HTML for today's menu using a headless Chromium browser."""
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        log.error(
            "Playwright is not installed.\n"
            "Run: pip install playwright && playwright install chromium"
        )
        return None

    weekday_name = _WEEKDAY_BG.get(today.weekday(), "")
    log.info("Target weekday tab: %r (index %d)", weekday_name, today.weekday())

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        try:
            page = browser.new_page()
            page.goto(url, wait_until="domcontentloaded", timeout=30_000)
            page.wait_for_timeout(2_000)

            _click_today_tab(page, today.weekday(), weekday_name)

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


def extract_full_menu_text(html: str) -> str:
    """Return cleaned line-by-line text from the menu section of the page."""
    soup = BeautifulSoup(html, "lxml")

    for tag in soup(["script", "style", "noscript", "meta", "link"]):
        tag.decompose()

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
    for selector in (
        f"[data-day='{weekday_idx}']",
        f"[data-weekday='{weekday_idx}']",
        f"[data-index='{weekday_idx}']",
        f".day-tab:nth-child({weekday_idx + 1})",
        f".nav-item:nth-child({weekday_idx + 1})",
        f"li:nth-child({weekday_idx + 1}) a",
    ):
        try:
            page.click(selector, timeout=2_000)
            page.wait_for_timeout(1_500)
            log.info("Clicked tab via selector: %s", selector)
            return
        except Exception:
            continue

    log.warning("Could not identify today's tab; using currently visible content.")
