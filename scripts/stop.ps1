$ErrorActionPreference = "Stop"

Set-Location (Join-Path $PSScriptRoot "..")
docker rm -f pm-app *> $null

Write-Host "Stopped pm-app"
