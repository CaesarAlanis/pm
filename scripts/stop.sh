#!/usr/bin/env bash
set -euo pipefail

pkill -f "backend/app.py" || true
pkill -f "next dev" || true
printf 'Stopped local servers.\n'
