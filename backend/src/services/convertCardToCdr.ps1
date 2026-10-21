param(
  [Parameter(Mandatory = $true)][string]$InputPath,
  [Parameter(Mandatory = $true)][string]$OutputPath
)

$ErrorActionPreference = 'Stop'
$app = $null
$document = $null
$startedApplication = $false
try {
  $progId = if ($env:CORELDRAW_PROG_ID) { $env:CORELDRAW_PROG_ID } else { 'CorelDRAW.Application.25' }
  try { $app = [Runtime.InteropServices.Marshal]::GetActiveObject($progId) } catch {}
  if ($null -eq $app) {
    $app = New-Object -ComObject $progId
    $startedApplication = $true
    $app.Visible = $false
  }
  $document = $app.OpenDocument($InputPath)
  $document.SaveAs($OutputPath)
  if (-not (Test-Path -LiteralPath $OutputPath)) { throw 'CorelDRAW did not save a CDR file.' }
} finally {
  if ($null -ne $document) { try { $document.Close() } catch {} }
  if ($startedApplication -and $null -ne $app) { try { $app.Quit() } catch {} }
}
