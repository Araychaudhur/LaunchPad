param(
  [Parameter(Mandatory = $true)][string]$ApiImage,
  [Parameter(Mandatory = $true)][string]$WebImage,
  [int]$MaxWait = 60
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Write-Host "==> Deploying GREEN with images:"
Write-Host "    API: $ApiImage"
Write-Host "    WEB: $WebImage"

# 1) Pull images locally (so compose won't fail on network hiccups)
docker pull $ApiImage | Out-Null
docker pull $WebImage | Out-Null

# 2) Export env vars so compose override can read them
$env:API_IMAGE_GREEN = $ApiImage
$env:WEB_IMAGE_GREEN = $WebImage

# 3) Start GREEN alongside BLUE
docker compose -f docker-compose.yml -f docker-compose.override.deploy.yml --profile green up -d api-green web-green

# 4) Health-check GREEN inside the app network
docker pull curlimages/curl:8.5.0 | Out-Null
$net = "launchpad_app-net"

function WaitHealthy([string]$url, [int]$limit) {
  for ($i = 1; $i -le $limit; $i++) {
    $code = docker run --rm --network $net curlimages/curl:8.5.0 -s -o /dev/null -w "%{http_code}" $url
    if ($code -eq "200") { return $true }
    Start-Sleep -Seconds 2
    if ($i % 10 -eq 0) { Write-Host "   waiting on $url ($i/$limit)..." }
  }
  return $false
}

if (-not (WaitHealthy "http://api-green:3001/health" $MaxWait)) { throw "api-green failed health check" }
if (-not (WaitHealthy "http://web-green:3000/"      $MaxWait)) { throw "web-green failed health check" }
Write-Host "==> GREEN is healthy."

# 5) Switch traffic to GREEN by reloading edge with ACTIVE_COLOR
$env:ACTIVE_COLOR = "green"
docker compose up -d edge

# 6) Verify via localhost (external)
$ok = $false
for ($i = 1; $i -le $MaxWait; $i++) {
  try {
    Invoke-RestMethod http://localhost:8080/api/health | Out-Null
    $ok = $true
    break
  } catch {
    Start-Sleep -Seconds 2
  }
}
if (-not $ok) { throw "edge failed after switch" }

Write-Host "==> Traffic on GREEN. Done."
