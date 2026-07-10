$ErrorActionPreference = "Stop"
$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $projectRoot

if (Test-Path (Join-Path $PSScriptRoot "stop.ps1")) {
    & (Join-Path $PSScriptRoot "stop.ps1")
}

if (-not (Get-Command uv -ErrorAction SilentlyContinue)) {
    Write-Error "uv is required. Install it from https://astral.sh/uv"
    exit 1
}

$venvDir = Join-Path $projectRoot ".venv"
$venvPython = Join-Path $venvDir "Scripts\python.exe"

if (-not (Test-Path $venvPython)) {
    if (Test-Path $venvDir) {
        Remove-Item -Recurse -Force $venvDir
    }
    uv venv $venvDir
}

uv pip install --python $venvPython -r backend/requirements.txt

Set-Location frontend
npm install
npm run build
Set-Location $projectRoot

$env:PYTHONPATH = "."
& $venvPython -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
