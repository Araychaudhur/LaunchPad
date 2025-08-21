param(
  [Parameter(Mandatory=$true)][ValidateSet("green","blue")]$Color,
  [Parameter(Mandatory=$true)][string]$ApiImage,
  [Parameter(Mandatory=$true)][string]$WebImage,
  [switch]$RunMigrations
)

$ErrorActionPreference = "Stop"
Write-Host "==> Deploying color '$Color' with images:"
Write-Host "    API: $ApiImage"
Write-Host "    WEB: $WebImage"

# 0) Ensure curl image present for health checks
docker pull curlimages/curl:8.5.0 | Out-Null

# 1) Pull images
docker pull $ApiImage | Out-Null
docker pull $WebImage | Out-Null

# 2) Export env vars for compose override
if ($Color -eq "green") {
  $env:API_IMAGE_GREEN = $ApiImage
  $env:WEB_IMAGE_GREEN = $WebImage

  Write-Host "==> Starting GREEN alongside BLUE..."
  docker compose -f docker-compose.yml -f docker-compose.override.deploy.yml --profile green up -d api-green web-green

  # 3) Health-check green (inside app network)
  function Test-Endpoint($url) {
    $max=60
    for ($i=1; $i -le $max; $i++) {
      $code = docker run --rm --network launchpad_app-net curlimages/curl:8.5.0 -s -o /dev/null -w "%{http_code}" $url
      if ($code -eq "200") { return $true }
      Start-Sleep -Seconds 2
      if ($i % 10 -eq 0) { Write-Host "   waiting on $url (attempt $i/$max)..." }
    }
    return $false
  }

  if (!(Test-Endpoint "http://api-green:3001/health")) { throw "api-green failed health check" }
  if (!(Test-Endpoint "http://web-green:3000/")) { throw "web-green failed health check" }
  Write-Host "==> GREEN is healthy."

  # 4) Optional DB migrations (gated by green health)
  if ($RunMigrations) {
    Write-Host "==> Running DB migrations..."
    $u  = (Select-String -Path .env -Pattern '^POSTGRES_USER=').Line.Split('=')[1]
    $db = (Select-String -Path .env -Pattern '^POSTGRES_DB=').Line.Split('=')[1]
    $migrateDir = "infra/postgres/migrate"
    if (Test-Path $migrateDir) {
      Get-ChildItem $migrateDir -Filter *.sql | Sort-Object Name | ForEach-Object {
        Write-Host "   applying $($_.Name)"
        docker compose exec -T postgres psql -U $u -d $db -v ON_ERROR_STOP=1 -f "/workspace/$($_.FullName.Replace('\','/'))" 2>$null
      }
    } else {
      Write-Host "   no migrations directory found ($migrateDir) – skipping"
    }
    # Recheck green
    if (!(Test-Endpoint "http://api-green:3001/health")) { throw "api-green unhealthy after migrations" }
  }

  # 5) Switch traffic to GREEN
  Write-Host "==> Switching edge to GREEN..."
  $env:ACTIVE_COLOR = "green"
  docker compose up -d edge
  if (!(Test-Endpoint "http://edge:8080/api/health")) {
    # fallback: check via localhost
    $ok=$false
    for ($i=1;$i -le 30;$i++){
      try { Invoke-RestMethod http://localhost:8080/api/health | Out-Null; $ok=$true; break } catch { Start-Sleep 2 }
    }
    if (-not $ok) { throw "edge failed after switch" }
  }
  Write-Host "==> Traffic on GREEN. Done."

} else {
  # Deploy BLUE similarly, if you ever need to promote blue again using images
  Write-Host "==> Starting BLUE alongside GREEN..."
  $env:API_IMAGE_BLUE = $ApiImage
  $env:WEB_IMAGE_BLUE = $WebImage
  docker compose -f docker-compose.yml -f docker-compose.override.deploy.yml up -d api-blue web-blue
  Write-Host "==> Switch to BLUE..."
  $env:ACTIVE_COLOR = "blue"
  docker compose up -d edge
  Write-Host "==> Traffic on BLUE. Done."
}
