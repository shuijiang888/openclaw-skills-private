#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://127.0.0.1:3000}"
PAGE_PREFIX="${2:-}"
PASS="${AUTH_PASSWORD:-111600}"

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required but not installed"
  exit 1
fi

tmp_cookie="$(mktemp)"
trap 'rm -f "$tmp_cookie"' EXIT

echo "[profit-smoke] [1/8] Gate auth..."
curl -fsS -c "$tmp_cookie" -X POST "${BASE_URL}/api/auth/verify" \
  -H "content-type: application/json" \
  -d "{\"password\":\"${PASS}\"}" >/dev/null

echo "[profit-smoke] [2/8] Portal reachable..."
curl -fsS -b "$tmp_cookie" "${BASE_URL}${PAGE_PREFIX}/" >/dev/null

echo "[profit-smoke] [3/8] Health API..."
curl -fsS -b "$tmp_cookie" "${BASE_URL}/api/health" | jq -e '.ok==true' >/dev/null

echo "[profit-smoke] [4/8] Dashboard reachable..."
curl -fsS -b "$tmp_cookie" "${BASE_URL}${PAGE_PREFIX}/dashboard" >/dev/null

echo "[profit-smoke] [5/8] Data-screen reachable..."
curl -fsS -b "$tmp_cookie" "${BASE_URL}${PAGE_PREFIX}/data-screen" >/dev/null

echo "[profit-smoke] [6/8] Projects list API..."
curl -fsS -b "$tmp_cookie" -H "x-demo-role: SALES_DIRECTOR" "${BASE_URL}/api/projects" \
  | jq -e 'type=="array"' >/dev/null

echo "[profit-smoke] [7/8] Compass API..."
curl -fsS -b "$tmp_cookie" -H "x-demo-role: SALES_DIRECTOR" "${BASE_URL}/api/compass" \
  | jq -e '.items|type=="array"' >/dev/null

echo "[profit-smoke] [8/8] Console home reachable..."
curl -fsS -b "$tmp_cookie" -H "x-demo-role: ADMIN" "${BASE_URL}${PAGE_PREFIX}/console" >/dev/null

echo "[profit-smoke] Passed."
