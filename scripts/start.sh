#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

./scripts/stop.sh || true

if ! command -v uv >/dev/null 2>&1; then
  echo "uv is required. Install it from https://astral.sh/uv" >&2
  exit 1
fi

if [ ! -d .venv ] || [ ! -x .venv/bin/python ]; then
  rm -rf .venv
  uv venv .venv
fi

uv pip install --python .venv/bin/python -r backend/requirements.txt

(cd frontend && npm install && npm run build)

export PYTHONPATH=.
.venv/bin/python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
