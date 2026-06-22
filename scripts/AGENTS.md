# Scripts Notes

This folder contains cross-platform scripts for local Docker workflow.

## Host Scripts

- `start.ps1` and `start.sh`: start the app with `docker compose up --build -d`.
- `stop.ps1` and `stop.sh`: stop and clean up with `docker compose down --remove-orphans`.

## Container Script

- `run-container.sh`: starts Next.js runtime and FastAPI in one container and handles shutdown signals.