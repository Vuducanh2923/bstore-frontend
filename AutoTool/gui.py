"""Thread-safe Tkinter status window."""
from __future__ import annotations

import queue
import tkinter as tk
from tkinter import ttk
from typing import Callable


class AutomationGUI:
    def __init__(self, start: Callable[[], None], pause: Callable[[], None], stop: Callable[[], None]) -> None:
        self.root = tk.Tk()
        self.root.title("AutoTool - Visible UI Automation")
        self.root.geometry("440x330")
        self.root.resizable(False, False)
        self._stop = stop
        self._updates: queue.Queue[dict[str, str | int]] = queue.Queue()
        self.vars = {key: tk.StringVar(value=value) for key, value in {
            "status": "Paused", "loops": "0", "success": "0", "failed": "0",
            "runtime": "00:00:00", "action": "Waiting",
        }.items()}

        frame = ttk.Frame(self.root, padding=18)
        frame.pack(fill="both", expand=True)
        ttk.Label(frame, text="AutoTool", font=("Segoe UI", 18, "bold")).pack(anchor="w", pady=(0, 12))
        labels = (("Status", "status"), ("Total loops", "loops"), ("Successful operations", "success"),
                  ("Failed operations", "failed"), ("Runtime", "runtime"), ("Current action", "action"))
        grid = ttk.Frame(frame)
        grid.pack(fill="x")
        for row, (caption, key) in enumerate(labels):
            ttk.Label(grid, text=caption + ":").grid(row=row, column=0, sticky="w", pady=5)
            ttk.Label(grid, textvariable=self.vars[key], font=("Segoe UI", 10, "bold")).grid(row=row, column=1, sticky="w", padx=16)
        buttons = ttk.Frame(frame)
        buttons.pack(fill="x", pady=(18, 0))
        ttk.Button(buttons, text="Start (F8)", command=start).pack(side="left", expand=True, fill="x", padx=(0, 5))
        ttk.Button(buttons, text="Pause (F9)", command=pause).pack(side="left", expand=True, fill="x", padx=5)
        ttk.Button(buttons, text="Exit (F10)", command=stop).pack(side="left", expand=True, fill="x", padx=(5, 0))
        self.root.protocol("WM_DELETE_WINDOW", stop)
        self.root.after(100, self._drain_updates)

    def update(self, **values: str | int) -> None:
        self._updates.put(values)

    def _drain_updates(self) -> None:
        try:
            while True:
                for key, value in self._updates.get_nowait().items():
                    if key in self.vars:
                        self.vars[key].set(str(value))
        except queue.Empty:
            pass
        self.root.after(100, self._drain_updates)

    def run(self) -> None:
        self.root.mainloop()

    def close(self) -> None:
        self.root.after(0, self.root.destroy)
