"""Human-paced visible mouse interaction with click de-duplication."""
from __future__ import annotations

import random
import threading
import time

import pyautogui

from config import Settings
from detector import Detection


class SafeClicker:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._last_click: dict[str, float] = {}
        pyautogui.FAILSAFE = True
        pyautogui.PAUSE = 0

    def click(self, detection: Detection, stop_event: threading.Event) -> bool:
        now = time.monotonic()
        cooldown = self.settings.click_cooldown_ms / 1000
        if now - self._last_click.get(detection.name, 0.0) < cooldown:
            return False
        delay = random.uniform(self.settings.random_delay_min_ms, self.settings.random_delay_max_ms) / 1000
        if stop_event.wait(delay):
            return False
        duration = random.uniform(self.settings.move_duration_min_s, self.settings.move_duration_max_s)
        pyautogui.moveTo(*detection.center, duration=duration, tween=pyautogui.easeInOutQuad)
        if stop_event.is_set():
            return False
        pyautogui.click(clicks=1, interval=0)
        self._last_click[detection.name] = time.monotonic()
        return True
