#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://119.45.205.137}"
PASS="${AUTH_PASSWORD:-042200}"

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required but not installed"
  exit 1
fi

tmp_cookie="$(mktemp)"
trap 'rm -f "$tmp_cookie"' EXIT

echo "[1/7] Gate auth..."
curl -fsS -c "$tmp_cookie" -X POST "$BASE_URL/api/auth/verify" \
  -H "content-type: application/json" \
  -d "{\"password\":\"$PASS\"}" >/dev/null

echo "[2/7] Portal reachable..."
curl -fsS -b "$tmp_cookie" "$BASE_URL/" >/dev/null

echo "[3/7] ZT overview..."
curl -fsS -b "$tmp_cookie" -H "x-demo-role: ADMIN" "$BASE_URL/api/zt/overview" | jq -e '.overview.systemName=="智探007"' >/dev/null

echo "[4/7] ZT action cards visible for ADMIN..."
curl -fsS -b "$tmp_cookie" -H "x-demo-role: ADMIN" "$BASE_URL/api/zt/action-cards" | jq -e '.items|type=="array"' >/dev/null

echo "[5/7] ZT bounty tasks >= 5..."
curl -fsS -b "$tmp_cookie" -H "x-demo-role: ADMIN" "$BASE_URL/api/zt/bounty-tasks" | jq -e '.items|length>=5' >/dev/null

echo "[6/7] ZT submission feedback includes points/rank..."
curl -fsS -b "$tmp_cookie" -H "x-demo-role: SALES_DIRECTOR" -H "content-type: application/json" \
  -X POST "$BASE_URL/api/zt/submissions" \
  -d "{\"title\":\"验收脚本提交\",\"content\":\"自动验收\",\"region\":\"成都\",\"format\":\"text\",\"signalType\":\"tactical\"}" \
  | jq -e '.pointsDelta==8 and (.rankLabel|type=="string") and (.ledgerId|type=="string")' >/dev/null

echo "[7/7] ZT me in demo mode should not 401..."
status="$(curl -sS -o /tmp/ztme.json -w "%{http_code}" -b "$tmp_cookie" -H "x-demo-role: SALES_DIRECTOR" "$BASE_URL/api/zt/me")"
if [[ "$status" != "200" ]]; then
  echo "Expected 200 for /api/zt/me, got $status"
  cat /tmp/ztme.json
  exit 1
fi
jq -e '.me.ztRole|type=="string"' /tmp/ztme.json >/dev/null

echo "ZT acceptance passed."
