"""Fast screen capture and multi-scale OpenCV template matching."""
from __future__ import annotations

from dataclasses import dataclass
import logging
from pathlib import Path

import cv2
import mss
import numpy as np


@dataclass(frozen=True, slots=True)
class Detection:
    name: str
    center: tuple[int, int]
    confidence: float
    box: tuple[int, int, int, int]


class TemplateDetector:
    def __init__(self, image_dir: Path, threshold: float, scales: tuple[float, ...], monitor: int = 0) -> None:
        self.log = logging.getLogger(type(self).__name__)
        self.threshold = threshold
        self.scales = scales
        self.monitor_index = monitor
        self.templates: dict[str, np.ndarray] = {}
        for path in image_dir.glob("*.png"):
            image = cv2.imread(str(path), cv2.IMREAD_GRAYSCALE)
            if image is None:
                self.log.warning("Could not load template: %s", path)
            else:
                self.templates[path.stem] = image

    def capture(self) -> tuple[np.ndarray, dict[str, int]]:
        with mss.mss() as grabber:
            # 0 means the combined virtual desktop; positive values select a monitor.
            index = self.monitor_index if 0 <= self.monitor_index < len(grabber.monitors) else 0
            monitor = grabber.monitors[index]
            frame = np.asarray(grabber.grab(monitor))
        return cv2.cvtColor(frame, cv2.COLOR_BGRA2GRAY), monitor

    def find(self, screen: np.ndarray, monitor: dict[str, int], name: str) -> Detection | None:
        template = self.templates.get(name)
        if template is None:
            return None
        best: tuple[float, tuple[int, int], int, int] | None = None
        for scale in self.scales:
            width = max(1, round(template.shape[1] * scale))
            height = max(1, round(template.shape[0] * scale))
            if width > screen.shape[1] or height > screen.shape[0]:
                continue
            interpolation = cv2.INTER_AREA if scale < 1 else cv2.INTER_CUBIC
            resized = cv2.resize(template, (width, height), interpolation=interpolation)
            result = cv2.matchTemplate(screen, resized, cv2.TM_CCOEFF_NORMED)
            _, score, _, location = cv2.minMaxLoc(result)
            if best is None or score > best[0]:
                best = (float(score), location, width, height)
        if best is None or best[0] < self.threshold:
            return None
        score, (x, y), width, height = best
        left, top = x + monitor["left"], y + monitor["top"]
        # The failure template contains the whole dialog for uniqueness; its
        # actionable button sits near 69% width / 85% height of that rectangle.
        if name == "failed":
            center = (left + round(width * 0.69), top + round(height * 0.85))
        else:
            center = (left + width // 2, top + height // 2)
        return Detection(name, center, score, (left, top, width, height))

    def find_first(self, names: tuple[str, ...]) -> Detection | None:
        screen, monitor = self.capture()
        for name in names:
            detection = self.find(screen, monitor, name)
            if detection:
                return detection
        return None
