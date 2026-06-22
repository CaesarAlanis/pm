#!/usr/bin/env bash
set -euo pipefail

FASTAPI_HOST="${FASTAPI_HOST:-0.0.0.0}"
FASTAPI_PORT="${FASTAPI_PORT:-8000}"
NEXT_HOST="${NEXT_HOST:-127.0.0.1}"
NEXT_PORT="${NEXT_PORT:-3000}"

cd /app

shutdown() {
  local code="$?"
  if [[ -n "${API_PID:-}" ]]; then
    kill "${API_PID}" 2>/dev/null || true
  fi
  if [[ -n "${NEXT_PID:-}" ]]; then
    kill "${NEXT_PID}" 2>/dev/null || true
  fi
  wait 2>/dev/null || true
  exit "${code}"
}

trap shutdown SIGINT SIGTERM

echo "Starting Next.js on ${NEXT_HOST}:${NEXT_PORT}"
cd /app/frontend
npm run start -- --hostname "${NEXT_HOST}" --port "${NEXT_PORT}" &
NEXT_PID=$!

echo "Waiting for Next.js runtime to become available"
for _ in $(seq 1 60); do
  if curl --silent --fail "http://${NEXT_HOST}:${NEXT_PORT}" >/dev/null; then
    break
  fi
  sleep 1
done

echo "Starting FastAPI on ${FASTAPI_HOST}:${FASTAPI_PORT}"
cd /app/backend
uv run uvicorn app.main:app --host "${FASTAPI_HOST}" --port "${FASTAPI_PORT}" &
API_PID=$!

wait -n "${NEXT_PID}" "${API_PID}"
shutdown