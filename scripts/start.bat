@echo off
setlocal

cd /d "%~dp0\.."

docker rm -f pm-app >nul 2>&1
docker build -t pm-app .

if not exist data mkdir data
if not exist data\pm.db if exist backend\pm.db copy backend\pm.db data\pm.db >nul

if exist .env (
  docker run -d --name pm-app --env-file .env -e PM_DB_PATH=/app/data/pm.db -v "%cd%\data:/app/data" -p 8000:8000 pm-app
) else (
  echo Warning: .env not found; OPENROUTER_API_KEY will be unavailable in container
  docker run -d --name pm-app -e PM_DB_PATH=/app/data/pm.db -v "%cd%\data:/app/data" -p 8000:8000 pm-app
)

echo Application running at http://localhost:8000
