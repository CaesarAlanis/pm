$ErrorActionPreference = "Stop"

Set-Location (Join-Path $PSScriptRoot "..")

docker rm -f pm-app *> $null
docker build -t pm-app .

New-Item -ItemType Directory -Force -Path data | Out-Null
if (-not (Test-Path "data/pm.db") -and (Test-Path "backend/pm.db")) {
    Copy-Item "backend/pm.db" "data/pm.db"
}

$volume = "$(Get-Location)/data:/app/data"
if (Test-Path ".env") {
    docker run -d --name pm-app --env-file .env -e PM_DB_PATH=/app/data/pm.db -v $volume -p 8000:8000 pm-app
} else {
    Write-Host "Warning: .env not found; OPENROUTER_API_KEY will be unavailable in container"
    docker run -d --name pm-app -e PM_DB_PATH=/app/data/pm.db -v $volume -p 8000:8000 pm-app
}

Write-Host "Application running at http://localhost:8000"
