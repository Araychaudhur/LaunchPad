param(
  [Parameter(Mandatory=$true)][ValidateSet("blue","green")]$ToColor
)
$ErrorActionPreference = "Stop"
Write-Host "==> Rolling back traffic to $ToColor ..."
$env:ACTIVE_COLOR = $ToColor
docker compose up -d edge
# Quick check
for ($i=1;$i -le 30;$i++){
  try { Invoke-RestMethod http://localhost:8080/api/health | Out-Null; break } catch { Start-Sleep 2 }
}
Write-Host "==> Rolled back. Current color: $ToColor"
