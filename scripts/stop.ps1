$ErrorActionPreference = "Stop"
$processes = Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match "uvicorn backend.main:app" }

foreach ($process in $processes) {
    Stop-Process -Id $process.ProcessId -Force
}
