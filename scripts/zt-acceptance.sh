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

echo "[6/10] ZT submission feedback includes points/rank..."
def_payload="$(curl -fsS -b "$tmp_cookie" -H "x-demo-role: ADMIN" "$BASE_URL/api/zt/intel-definitions" \
  | jq -c '
      .items[0] as $def
      | {
          intelDefId: $def.id,
          title: "验收脚本提交",
          content: "自动验收",
          region: "成都",
          format: (($def.allowedFormats[0] // "text")),
          signalType: (($def.allowedSignalTypes[0] // "tactical")),
          extraFields: (
            reduce (($def.requiredFields // [])[]) as $f ({};
              if ($f=="title" or $f=="content" or $f=="region" or $f=="format" or $f=="signalType" or $f=="intelDefId" or $f=="taskId")
              then .
              else . + {($f): "验收补充字段"}
              end
            )
          )
        }'
)"
curl -fsS -b "$tmp_cookie" -H "x-demo-role: SALES_DIRECTOR" -H "content-type: application/json" \
  -X POST "$BASE_URL/api/zt/submissions" \
  -d "$def_payload" \
  | jq -e '.submission.pointsGranted==8 and ((.feedback.currentPoints|type)=="number") and ((.feedback.ledgerId|type)=="string") and ((.feedback.rank|type)=="string")' >/dev/null

echo "[7/10] ZT me in demo mode should not 401..."
status="$(curl -sS -o /tmp/ztme.json -w "%{http_code}" -b "$tmp_cookie" -H "x-demo-role: SALES_DIRECTOR" "$BASE_URL/api/zt/me")"
if [[ "$status" != "200" ]]; then
  echo "Expected 200 for /api/zt/me, got $status"
  cat /tmp/ztme.json
  exit 1
fi
jq -e '.me.ztRole|type=="string"' /tmp/ztme.json >/dev/null

echo "[8/10] War-room snapshot available..."
curl -fsS -b "$tmp_cookie" -H "x-demo-role: ADMIN" "$BASE_URL/api/zt/strategist/snapshot" \
  | jq -e '.ok==true and (.snapshot.kpis|type=="object")' >/dev/null

echo "[9/10] Monitoring endpoint available and non-critical..."
curl -fsS -b "$tmp_cookie" -H "x-demo-role: ADMIN" "$BASE_URL/api/zt/monitoring" \
  | jq -e '(.status=="ok" or .status=="warning") and (.alerts|type=="array")' >/dev/null

echo "[10/10] Console redemptions manager endpoint reachable..."
curl -fsS -b "$tmp_cookie" -H "x-demo-role: ADMIN" "$BASE_URL/api/console/zt/redemptions" \
  | jq -e '.items|type=="array"' >/dev/null

echo "ZT acceptance passed."
