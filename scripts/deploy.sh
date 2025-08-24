#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/deploy.sh <API_IMAGE> <WEB_IMAGE> [--smoke]
API_IMAGE_GREEN="${1:?API image required}"
WEB_IMAGE_GREEN="${2:?Web image required}"
SMOKE="${3:-}"

export API_IMAGE_GREEN
export WEB_IMAGE_GREEN

# Bring up infra if not running yet (idempotent)
docker compose up -d postgres redis otel-collector prometheus grafana maildev

# Start GREEN using the override that pins images
docker compose -f docker-compose.yml -f docker-compose.override.deploy.yml up -d api-green web-green

echo "[deploy] Waiting for GREEN internal health…"
health_check () {
  local url="$1"
  # run curl *inside the compose network* so host DNS isn't required
  docker compose run --rm --no-deps -T curl curlimages/curl:8.8.0 \
    sh -c "for i in \$(seq 1 60); do curl -fsS '${url}' >/dev/null && exit 0; sleep 2; done; exit 1"
}

# Internal (container-to-container) health
health_check "http://api-green:3001/health"
health_check "http://web-green:3000/"

# Switch edge to GREEN
export ACTIVE_COLOR="green"
docker compose up -d edge

echo "[deploy] Verifying external health via edge…"
ext_check () {
  local url="$1"
  for i in $(seq 1 60); do
    if curl -fsS "$url" >/dev/null; then return 0; fi
    sleep 2
  done
  return 1
}

ext_check "http://localhost:8080/api/health"
ext_check "http://localhost:8080/"

if [ "$SMOKE" = "--smoke" ]; then
  ./scripts/smoke.sh
fi

echo "[deploy] GREEN is live via edge."
