$ErrorActionPreference = "Stop"

if (docker ps -a -q -f "name=pm-app") {
  docker stop pm-app | Out-Null
  docker rm pm-app | Out-Null
}

Write-Host "App stopped."
