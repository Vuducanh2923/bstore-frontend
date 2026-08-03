# AutoTool

Windows-only visible UI automation using screenshots and simulated input. It does
not read process memory, inject code, or bypass anti-cheat systems.

## Setup

```powershell
py -3.12 -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python main.py
```

Keep the game in the same language/theme used by the supplied templates. Use F8
to start, F9 to pause, and F10 to exit. If recognition is unreliable, adjust
`confidence` (normally 0.75-0.90) in `config.json`. PyAutoGUI's fail-safe remains
enabled: moving the pointer to the top-left corner aborts mouse automation.
