param(
  [Parameter(Mandatory=$true)][string]$ApiImage,
  [Parameter(Mandatory=$true)][string]$WebImage,
  [switch]$Smoke,
  [int]$MaxWait = 60
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

Write-Output "Deploying GREEN with images"
Write-Output "API: $ApiImage"
Write-Output "WEB: $WebImage"

# Pull images first
docker pull $ApiImage | Out-Null
docker pull $WebImage | Out-Null

# Provide images to compose override
$env:API_IMAGE_GREEN = $ApiImage
$env:WEB_IMAGE_GREEN  = $WebImage

# Start GREEN
docker compose -f docker-compose.yml -f docker-compose.override.deploy.yml --profile green up -d api-green web-green

# Health-check GREEN inside app network
docker pull curlimages/curl:8.5.0 | Out-Null
$net = "launchpad_app-net"

function WaitHealthy([string]$url, [int]$limit) {
  for ($i=1; $i -le $limit; $i++) {
    $code = docker run --rm --network $net curlimages/curl:8.5.0 -s -o /dev/null -w "%{http_code}" $url
    if ($code -eq "200") { return $true }
    Start-Sleep -Seconds 2
  }
  return $false
}

if (-not (WaitHealthy "http://api-green:3001/health" $MaxWait)) { throw "api-green failed health" }
if (-not (WaitHealthy "http://web-green:3000/"      $MaxWait)) { throw "web-green failed health" }

# Switch edge to GREEN
$env:ACTIVE_COLOR = "green"
docker compose up -d edge

# Verify edge externally
$ok = $false
for ($i=1; $i -le $MaxWait; $i++) {
  try { Invoke-RestMethod http://localhost:8080/api/health | Out-Null; $ok = $true; break } catch { Start-Sleep -Seconds 2 }
}
if (-not $ok) { throw "edge failed after switch" }

# Optional smoke
if ($Smoke) {
  $smokePath = Join-Path $PSScriptRoot "smoke.ps1"
  & $smokePath -Tries 10 -DelaySeconds 2
  Write-Output "Smoke PASS."
}

Write-Output "Deploy complete."
