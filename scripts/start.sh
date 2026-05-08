#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

docker rm -f pm-app >/dev/null 2>&1 || true

docker build -t pm-app .

mkdir -p data
if [[ ! -f data/pm.db && -f backend/pm.db ]]; then
  cp backend/pm.db data/pm.db
fi

if [[ -f .env ]]; then
  docker run -d \
    --name pm-app \
    --env-file .env \
    -e PM_DB_PATH=/app/data/pm.db \
    -v "$PWD/data:/app/data" \
    -p 8000:8000 \
    pm-app
else
  echo "Warning: .env not found; OPENROUTER_API_KEY will be unavailable in container"
  docker run -d \
    --name pm-app \
    -e PM_DB_PATH=/app/data/pm.db \
    -v "$PWD/data:/app/data" \
    -p 8000:8000 \
    pm-app
fi

echo "Application running at http://localhost:8000"
