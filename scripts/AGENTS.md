This folder contains start and stop scripts for local Docker usage.

- `start.sh` / `stop.sh` support macOS and Linux shells.
- `start.ps1` / `stop.ps1` support PowerShell.
- `start.bat` / `stop.bat` support Windows Command Prompt.

The start scripts build the Docker image, start `pm-app` on port `8000`, mount local `data/` for SQLite persistence, and pass root `.env` into the container when it exists.
