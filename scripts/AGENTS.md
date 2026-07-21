# Control Scripts Guidelines

This directory contains cross-platform control scripts for running the application container locally.

## Files

- `start.sh` / `start.bat`: Builds and starts the Docker container in detached mode (`docker compose up -d --build`).
- `stop.sh` / `stop.bat`: Stops and removes running containers (`docker compose down`).

## Usage

- **Linux / Mac**: `./scripts/start.sh` and `./scripts/stop.sh`
- **Windows**: `.\scripts\start.bat` and `.\scripts\stop.bat`