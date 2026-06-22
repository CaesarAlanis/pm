#!/usr/bin/env bash
set -euo pipefail

echo "Starting Project Management MVP container..."
docker compose up --build -d

echo "Application started."
echo "- App:  http://localhost:8000"
echo "- Demo: http://localhost:8000/demo"
echo "- API:  http://localhost:8000/api/health"