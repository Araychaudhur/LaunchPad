#!/bin/bash
set -euo pipefail
: "${ACTIVE_COLOR:=blue}"

API_HOST="api-${ACTIVE_COLOR}"
WEB_HOST="web-${ACTIVE_COLOR}"
API_URL="http://${API_HOST}:3001/health"
WEB_URL="http://${WEB_HOST}:3000"

echo "[edge] ACTIVE_COLOR=${ACTIVE_COLOR}"
echo "[edge] Waiting for API: ${API_URL}"
echo "[edge] Waiting for Web: http://${WEB_HOST}:3000"

# Wait up to ~120s total
for i in {1..60}; do
  API_OK=0
  WEB_OK=0
  curl -sf "$API_URL" >/dev/null 2>&1 && API_OK=1 || true
  curl -sf "http://${WEB_HOST}:3000" >/dev/null 2>&1 && WEB_OK=1 || true
  if [ $API_OK -eq 1 ] && [ $WEB_OK -eq 1 ]; then
    echo "[edge] API and Web are ready."
    break
  fi
  echo "[edge] Not ready yet ($i/60)…"
  sleep 2
done

# Render nginx.conf with the chosen color
envsubst '${ACTIVE_COLOR}' < /etc/nginx/templates/nginx.conf.template > /etc/nginx/nginx.conf

echo "[edge] Starting Nginx…"
nginx -g 'daemon off;'
