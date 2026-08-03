"""Application entry point and automation state machine."""
from __future__ import annotations

import logging
from pathlib import Path
import threading
import time

import keyboard

from clicker import SafeClicker
from config import ConfigManager
from detector import TemplateDetector
from gui import AutomationGUI
from utils import configure_logging, enable_dpi_awareness


BASE_DIR = Path(__file__).resolve().parent


class AutomationApp:
    LABELS = {
        "failed": "Purchase failed - closing", "ok": "Closing final dialog",
        "receive_now": "Clicking Receive Now", "confirm": "Confirming purchase",
        "search_again": "Starting next search",
    }

    def __init__(self) -> None:
        manager = ConfigManager(BASE_DIR / "config.json")
        self.settings = manager.load()
        manager.save(self.settings)
        self.detector = TemplateDetector(BASE_DIR / "images", self.settings.confidence,
                                         self.settings.template_scales, self.settings.monitor)
        self.clicker = SafeClicker(self.settings)
        self.stop_event = threading.Event()
        self.run_event = threading.Event()
        self.started_at: float | None = None
        self.accumulated_runtime = 0.0
        self.loops = self.success = self.failed = 0
        self.stage = "search"
        self.gui = AutomationGUI(self.start, self.pause, self.stop)
        self.worker = threading.Thread(target=self._worker, name="automation-worker", daemon=True)

    def start(self) -> None:
        if self.stop_event.is_set() or self.run_event.is_set():
            return
        self.started_at = time.monotonic()
        self.run_event.set()
        self.gui.update(status="Running", action="Scanning screen")
        logging.info("Automation started")

    def pause(self) -> None:
        if self.run_event.is_set() and self.started_at is not None:
            self.accumulated_runtime += time.monotonic() - self.started_at
        self.started_at = None
        self.run_event.clear()
        self.gui.update(status="Paused", action="Waiting")
        logging.info("Automation paused")

    def stop(self) -> None:
        if self.stop_event.is_set():
            return
        self.pause()
        self.stop_event.set()
        keyboard.unhook_all_hotkeys()
        logging.info("Automation stopped")
        self.gui.close()

    def _runtime(self) -> str:
        seconds = self.accumulated_runtime
        if self.run_event.is_set() and self.started_at is not None:
            seconds += time.monotonic() - self.started_at
        seconds = int(seconds)
        return f"{seconds // 3600:02}:{seconds % 3600 // 60:02}:{seconds % 60:02}"

    def _worker(self) -> None:
        while not self.stop_event.is_set():
            if not self.run_event.wait(0.1):
                continue
            try:
                # Expected transitions distinguish the two visually identical
                # Vietnamese "Xác nhận" buttons. Failure is valid at any stage.
                expected = {
                    "search": ("failed", "search_again"),
                    "confirm": ("failed", "confirm"),
                    "receive": ("failed", "receive_now"),
                    "finish": ("failed", "ok"),
                }
                found = self.detector.find_first(expected[self.stage])
                if found and self.clicker.click(found, self.stop_event):
                    logging.info("Clicked %s (confidence %.3f) at %s", found.name, found.confidence, found.center)
                    self.gui.update(action=self.LABELS[found.name])
                    if found.name == "failed":
                        self.failed += 1
                        self.loops += 1
                        self.stage = "search"
                    elif found.name == "ok":
                        self.success += 1
                        self.loops += 1
                        self.stage = "search"
                    elif found.name == "search_again":
                        self.stage = "confirm"
                    elif found.name == "confirm":
                        self.stage = "receive"
                    elif found.name == "receive_now":
                        self.stage = "finish"
                    self.gui.update(loops=self.loops, success=self.success, failed=self.failed)
                elif not found:
                    self.gui.update(action="Scanning screen")
            except Exception:
                # A transient capture/template error must not terminate the loop.
                logging.exception("Automation scan failed")
                self.gui.update(action="Scan error; retrying")
            self.gui.update(runtime=self._runtime())
            self.stop_event.wait(self.settings.scan_interval_ms / 1000)

    def run(self) -> None:
        self.worker.start()
        keyboard.add_hotkey("f8", self.start)
        keyboard.add_hotkey("f9", self.pause)
        keyboard.add_hotkey("f10", self.stop)
        self.gui.run()


if __name__ == "__main__":
    enable_dpi_awareness()
    configure_logging(BASE_DIR / "automation.log")
    AutomationApp().run()
