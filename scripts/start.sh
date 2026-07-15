#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

[ -d .venv ] || python3 -m venv .venv
source .venv/bin/activate
python3 backend/app.py > /tmp/pm-backend.log 2>&1 &

cd "$ROOT_DIR/frontend"
[ -d node_modules ] || npm install >/dev/null
npm run dev > /tmp/pm-frontend.log 2>&1 &

printf 'Backend and frontend started.\n'
printf 'Open http://localhost:3000\n'
