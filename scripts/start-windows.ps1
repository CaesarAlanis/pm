$ErrorActionPreference = "Stop"

if (docker ps -a -q -f "name=pm-app") {
  docker rm -f pm-app | Out-Null
}

docker build -t pm-app .
docker run -d --name pm-app -p 8000:8000 --env-file .env pm-app | Out-Null

Write-Host "App running at http://localhost:8000"
