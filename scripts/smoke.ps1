param([int]$Tries=10,[int]$DelaySeconds=2)
$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function T200([string]$u) {
  try {
    $r = Invoke-WebRequest -UseBasicParsing -Uri $u -Method GET -TimeoutSec 5
    return ($r.StatusCode -eq 200)
  } catch { return $false }
}

for ($i=1; $i -le $Tries; $i++) {
  if ( (T200 "http://localhost:8080/api/health") -and (T200 "http://localhost:8080/") ) { exit 0 }
  Start-Sleep -Seconds $DelaySeconds
}
throw "Smoke failed"
