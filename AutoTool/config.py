"""Configuration loading, validation, and persistence."""
from __future__ import annotations

import json
from dataclasses import asdict, dataclass, fields
from pathlib import Path


@dataclass(slots=True)
class Settings:
    scan_interval_ms: int = 300
    confidence: float = 0.82
    random_delay_min_ms: int = 200
    random_delay_max_ms: int = 600
    move_duration_min_s: float = 0.15
    move_duration_max_s: float = 0.45
    click_cooldown_ms: int = 900
    monitor: int = 0
    template_scales: tuple[float, ...] = (0.8, 1.0, 1.2, 1.25, 1.5)


class ConfigManager:
    def __init__(self, path: Path) -> None:
        self.path = path

    def load(self) -> Settings:
        defaults = Settings()
        if not self.path.exists():
            self.save(defaults)
            return defaults
        try:
            raw = json.loads(self.path.read_text(encoding="utf-8"))
            allowed = {f.name for f in fields(Settings)}
            data = {k: v for k, v in raw.items() if k in allowed}
            if "template_scales" in data:
                data["template_scales"] = tuple(float(x) for x in data["template_scales"])
            settings = Settings(**data)
            self._validate(settings)
            return settings
        except (OSError, ValueError, TypeError, json.JSONDecodeError):
            # Preserve a broken file for diagnosis and safely return defaults.
            return defaults

    def save(self, settings: Settings) -> None:
        payload = asdict(settings)
        payload["template_scales"] = list(settings.template_scales)
        self.path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    @staticmethod
    def _validate(s: Settings) -> None:
        if s.scan_interval_ms < 50 or not 0.0 < s.confidence <= 1.0:
            raise ValueError("Invalid scan interval or confidence")
        if s.random_delay_min_ms > s.random_delay_max_ms:
            raise ValueError("Invalid random delay range")
        if s.move_duration_min_s > s.move_duration_max_s:
            raise ValueError("Invalid movement duration range")
