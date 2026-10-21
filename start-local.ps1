$ErrorActionPreference = 'Stop'

$projectRoot = $PSScriptRoot
$nodeExe = (Get-Command node -ErrorAction Stop).Source
$logDir = Join-Path $env:TEMP 'jp-portal-local'
New-Item -ItemType Directory -Path $logDir -Force | Out-Null

function Test-LocalPort([int]$port) {
  return [bool](Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1)
}

if (Test-LocalPort 3001) {
  $cardsStatus = & curl.exe --max-time 3 -s -o NUL -w '%{http_code}' 'http://localhost:3001/api/cards'
  if ($cardsStatus -eq '404') {
    $apiListener = Get-NetTCPConnection -LocalPort 3001 -State Listen | Select-Object -First 1
    $apiProcessId = $apiListener.OwningProcess
    $apiProcess = Get-CimInstance Win32_Process -Filter "ProcessId=$apiProcessId"
    if ($apiProcess.CommandLine -match 'src[\\/]server\.js') {
      Stop-Process -Id $apiProcessId -Force
      for ($attempt = 0; $attempt -lt 20 -and (Test-LocalPort 3001); $attempt++) { Start-Sleep -Milliseconds 250 }
    } else {
      throw 'Port 3001 is occupied by an API without card support. Stop that process before starting JP Portal.'
    }
  }
}

if (-not (Test-LocalPort 3001)) {
  Start-Process -FilePath $nodeExe -ArgumentList @('src/server.js') `
    -WorkingDirectory (Join-Path $projectRoot 'backend') -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $logDir 'api.out.log') `
    -RedirectStandardError (Join-Path $logDir 'api.err.log') | Out-Null
}

if (-not (Test-LocalPort 5173)) {
  Start-Process -FilePath $nodeExe -ArgumentList @('node_modules/vite/bin/vite.js', '--host', '0.0.0.0', '--port', '5173', '--strictPort') `
    -WorkingDirectory $projectRoot -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $logDir 'frontend.out.log') `
    -RedirectStandardError (Join-Path $logDir 'frontend.err.log') | Out-Null
}

for ($attempt = 0; $attempt -lt 30; $attempt++) {
  if ((Test-LocalPort 3001) -and (Test-LocalPort 5173)) {
    $status = & curl.exe --max-time 3 -s -o NUL -w '%{http_code}' 'http://localhost:5173/api/health'
    if ($status -eq '200') {
      Write-Output 'JP Portal is ready: http://localhost:5173/'
      exit 0
    }
  }
  Start-Sleep -Milliseconds 500
}

throw "JP Portal did not start. Check logs in $logDir"
