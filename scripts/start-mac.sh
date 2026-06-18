#!/usr/bin/env bash
set -euo pipefail

docker rm -f pm-app >/dev/null 2>&1 || true
docker build -t pm-app .
docker run -d --name pm-app -p 8000:8000 --env-file .env pm-app

echo "App running at http://localhost:8000"
