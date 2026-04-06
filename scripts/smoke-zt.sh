#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://127.0.0.1:3000}"
PAGE_PREFIX="${2:-}"
PASS="${AUTH_PASSWORD:-042200}"

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required but not installed"
  exit 1
fi

tmp_cookie="$(mktemp)"
trap 'rm -f "$tmp_cookie"' EXIT

echo "[zt-smoke] [1/9] Gate auth..."
curl -fsS -c "$tmp_cookie" -X POST "${BASE_URL}/api/auth/verify" \
  -H "content-type: application/json" \
  -d "{\"password\":\"${PASS}\"}" >/dev/null

echo "[zt-smoke] [2/9] ZT entry page..."
curl -fsS -b "$tmp_cookie" "${BASE_URL}${PAGE_PREFIX}/zt007" >/dev/null

echo "[zt-smoke] [3/9] ZT overview API..."
curl -fsS -b "$tmp_cookie" -H "x-demo-role: ADMIN" "${BASE_URL}/api/zt/overview" \
  | jq -e '.overview.systemName=="智探007"' >/dev/null

echo "[zt-smoke] [4/9] ZT action cards API..."
curl -fsS -b "$tmp_cookie" -H "x-demo-role: ADMIN" "${BASE_URL}/api/zt/action-cards" \
  | jq -e '.items|type=="array"' >/dev/null

echo "[zt-smoke] [5/9] ZT bounty tasks API..."
curl -fsS -b "$tmp_cookie" -H "x-demo-role: ADMIN" "${BASE_URL}/api/zt/bounty-tasks" \
  | jq -e '.items|type=="array"' >/dev/null

echo "[zt-smoke] [6/9] ZT strategist snapshot..."
curl -fsS -b "$tmp_cookie" -H "x-demo-role: ADMIN" "${BASE_URL}/api/zt/strategist/snapshot" \
  | jq -e '.ok==true and (.snapshot.kpis|type=="object")' >/dev/null

echo "[zt-smoke] [7/9] ZT monitoring non-critical..."
curl -fsS -b "$tmp_cookie" -H "x-demo-role: ADMIN" "${BASE_URL}/api/zt/monitoring" \
  | jq -e '.status != "critical"' >/dev/null

echo "[zt-smoke] [8/9] ZT linkage API..."
curl -fsS -b "$tmp_cookie" -H "x-demo-role: ADMIN" "${BASE_URL}/api/zt/linkage" \
  | jq -e '.ok==true and (.byCity|type=="array")' >/dev/null

echo "[zt-smoke] [9/9] ZT console routes..."
curl -fsS -b "$tmp_cookie" -H "x-demo-role: ADMIN" "${BASE_URL}${PAGE_PREFIX}/console/system" >/dev/null
curl -fsS -b "$tmp_cookie" -H "x-demo-role: ADMIN" "${BASE_URL}${PAGE_PREFIX}/console/users" >/dev/null

echo "[zt-smoke] Passed."
