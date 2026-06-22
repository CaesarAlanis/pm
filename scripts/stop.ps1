Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Write-Host "Stopping Project Management MVP container..."
docker compose down --remove-orphans
Write-Host "Application stopped."