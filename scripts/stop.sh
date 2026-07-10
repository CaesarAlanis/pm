#!/usr/bin/env bash
set -euo pipefail
pkill -f "uvicorn backend.main:app" || true
