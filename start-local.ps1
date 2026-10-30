param([switch]$Dev)

$ErrorActionPreference = 'Stop'

$projectRoot = $PSScriptRoot
$nodeExe = (Get-Command node -ErrorAction Stop).Source
$npmCmd = (Get-Command npm.cmd -ErrorAction Stop).Source
$backendDir = Join-Path $projectRoot 'backend'
$logDir = Join-Path $env:TEMP 'jp-portal-local'
New-Item -ItemType Directory -Path $logDir -Force | Out-Null

function Test-LocalPort([int]$port) {
  return [bool](Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1)
}

Push-Location $backendDir
try {
  & $npmCmd run db:status-local *> $null
  if ($LASTEXITCODE -ne 0) {
    Write-Output 'Starting local PostgreSQL...'
    & $npmCmd run db:start-local
    if ($LASTEXITCODE -ne 0) {
      throw "PostgreSQL could not start. Check $(Join-Path $env:LOCALAPPDATA 'school-visit-postgres\postgres.log')"
    }
  }

  & $npmCmd run db:migrate
  if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL migrations failed. Check the database connection and backend/.env.' }
} finally { Pop-Location }

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
    -WorkingDirectory $backendDir -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $logDir 'api.out.log') `
    -RedirectStandardError (Join-Path $logDir 'api.err.log') | Out-Null
}

if (-not $Dev) {
  Push-Location $projectRoot
  try {
    & $npmCmd run build
    if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed.' }
  } finally { Pop-Location }
}

if (Test-LocalPort 5173) {
  $frontendListener = Get-NetTCPConnection -LocalPort 5173 -State Listen | Select-Object -First 1
  $frontendProcess = Get-CimInstance Win32_Process -Filter "ProcessId=$($frontendListener.OwningProcess)"
  $isVite = ($frontendProcess.CommandLine -match 'vite[\\/]bin[\\/]vite\.js') -and
    ($frontendProcess.CommandLine -like "*$projectRoot*")
  $isPreview = $frontendProcess.CommandLine -match 'vite\.js[" ]+preview(?:[" ]|$)'
  if (-not $isVite) { throw 'Port 5173 is occupied by another application.' }
  if ($isPreview -eq $Dev) {
    Stop-Process -Id $frontendListener.OwningProcess -Force
    for ($attempt = 0; $attempt -lt 20 -and (Test-LocalPort 5173); $attempt++) { Start-Sleep -Milliseconds 250 }
  }
}

if (-not (Test-LocalPort 5173)) {
  $frontendArgs = @('node_modules/vite/bin/vite.js')
  if (-not $Dev) { $frontendArgs += 'preview' }
  $frontendArgs += @('--host', '0.0.0.0', '--port', '5173', '--strictPort')
  Start-Process -FilePath $nodeExe -ArgumentList $frontendArgs `
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
