"""Screen-state classification for evidence and probe_status.

BANNED_OR_SUSPENDED is deliberately strict: AUDIT may act on it (BOT_LOST), so only unambiguous
phrases match, and the matched phrase is returned so the oversight log can show why.
"""

from __future__ import annotations

import re
from typing import Callable, Iterable, Optional, Tuple

BAN_PHRASES = (
    "account has been banned",
    "account has been suspended",
    "account is banned",
    "account is suspended",
    "permanently banned",
    "account suspended",
    "account banned",
)
NETWORK_PHRASES = ("connection lost", "network error", "unable to connect", "disconnected from server", "reconnect")
VERIFICATION_PHRASES = ("captcha", "verification code", "verify you are human", "slide to verify")

_KINGDOM_RE = re.compile(r"#\s?(\d{4})\b")
_COORD_RE = re.compile(r"\bX\s*[:：]\s*\d+", re.IGNORECASE)

Detector = Optional[Callable[..., bool]]


def match_phrase(lines: Iterable[str], phrases: Iterable[str]) -> Optional[str]:
    blob = " ".join(l.lower() for l in lines)
    blob = re.sub(r"\s+", " ", blob)
    for p in phrases:
        if p in blob:
            return p
    return None


def parse_kingdom(lines: Iterable[str]) -> Optional[int]:
    """Kingdom id from the world-map coordinate bar, e.g. '#4194 X:123 Y:456'."""
    for line in lines:
        if _COORD_RE.search(line):
            m = _KINGDOM_RE.search(line)
            if m:
                return int(m.group(1))
    return None


def classify(
    lines: Iterable[str],
    app_running: bool,
    screenshot_array=None,
    is_city_hud: Detector = None,
    is_world_map: Detector = None,
) -> Tuple[str, Optional[str]]:
    """Returns (screen_state, matched_phrase_or_None)."""
    lines = list(lines)
    if not app_running:
        return "SLEEP_APP_CLOSED", None
    phrase = match_phrase(lines, BAN_PHRASES)
    if phrase:
        return "BANNED_OR_SUSPENDED", phrase
    phrase = match_phrase(lines, VERIFICATION_PHRASES)
    if phrase:
        return "VERIFICATION_POPUP", phrase
    phrase = match_phrase(lines, NETWORK_PHRASES)
    if phrase:
        return "NETWORK_DISCONNECTED", phrase
    if screenshot_array is not None and getattr(screenshot_array, "shape", None) == (900, 1600, 3):
        try:
            if is_world_map and is_world_map(screenshot_array):
                return "WORLD_MAP", None
            if is_city_hud and is_city_hud(screenshot_array):
                return "CITY_VIEW", None
        except Exception:
            pass
    return "UNKNOWN", None


def load_detectors(scanner_dir: str):
    """Imports the proven HUD detectors from auto_tutorial_ch8.py (no side effects beyond OCR init)."""
    import importlib
    import sys

    if scanner_dir not in sys.path:
        sys.path.insert(0, scanner_dir)
    try:
        mod = importlib.import_module("auto_tutorial_ch8")
        return mod.is_city_hud, mod.is_world_map
    except Exception:
        return None, None
