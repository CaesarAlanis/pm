#!/usr/bin/env bash
echo "Starting Project Management MVP Docker Container..."
docker compose up -d --build
echo "Server started at http://localhost:8000"
