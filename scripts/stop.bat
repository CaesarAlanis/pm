@echo off
setlocal

cd /d "%~dp0\.."
docker rm -f pm-app >nul 2>&1

echo Stopped pm-app
