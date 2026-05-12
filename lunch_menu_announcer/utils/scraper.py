"""Web scraping for the lunch menu site.

Uses plain HTTP + BeautifulSoup. No JavaScript execution.
Assumption: today's menu content is present in the initial HTML response.
If that turns out to be false, replace this module with a Playwright-based
implementation that clicks the correct weekday tab before extracting.
"""

import re
import logging
from datetime import date

import requests
from bs4 import BeautifulSoup

log = logging.getLogger(__name__)

_HEADERS = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64)"}
_REQUEST_TIMEOUT = 15


def fetch_menu_html(url: str, today: date) -> str | None:  # noqa: ARG001
    """Fetch raw HTML from *url* using a plain HTTP GET."""
    try:
        r = requests.get(url, headers=_HEADERS, timeout=_REQUEST_TIMEOUT)
        r.raise_for_status()
        r.encoding = "utf-8"
        log.info("Fetched %d bytes from %s", len(r.text), url)
        return r.text
    except requests.RequestException as exc:
        log.error("HTTP request failed: %s", exc)
        return None


def extract_full_menu_text(html: str) -> str:
    """Return cleaned line-by-line text from the menu section of the page."""
    soup = BeautifulSoup(html, "lxml")

    for tag in soup(["script", "style", "noscript", "meta", "link"]):
        tag.decompose()

    # Try to isolate a semantic menu container before falling back to <body>
    container = (
        soup.find(class_=re.compile(r"menu|lunch|content|main.content", re.I))
        or soup.find("main")
        or soup.find("article")
        or soup.body
    )

    raw = container.get_text(separator="\n") if container else soup.get_text(separator="\n")
    lines = [ln.strip() for ln in raw.splitlines()]
    return "\n".join(ln for ln in lines if ln)
