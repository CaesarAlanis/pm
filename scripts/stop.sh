#!/usr/bin/env bash
set -euo pipefail

echo "Stopping Project Management MVP container..."
docker compose down --remove-orphans
echo "Application stopped."