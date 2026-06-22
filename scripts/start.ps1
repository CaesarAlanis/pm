Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Write-Host "Starting Project Management MVP container..."
docker compose up --build -d

Write-Host "Application started."
Write-Host "- App:  http://localhost:8000"
Write-Host "- Demo: http://localhost:8000/demo"
Write-Host "- API:  http://localhost:8000/api/health"