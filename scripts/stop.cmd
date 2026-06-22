@echo off
setlocal

echo Stopping Project Management MVP container...
docker compose down --remove-orphans
if errorlevel 1 exit /b %errorlevel%

echo Application stopped.