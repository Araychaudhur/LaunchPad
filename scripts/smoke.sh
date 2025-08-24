#!/usr/bin/env bash
set -euo pipefail

echo "[smoke] Hitting public endpoints via edge…"
for i in $(seq 1 30); do
  if curl -fsS http://localhost:8080/api/health >/dev/null && \
     curl -fsS http://localhost:8080/        >/dev/null; then
    echo "[smoke] OK"
    exit 0
  fi
  sleep 2
done

echo "[smoke] FAILED"
exit 1
