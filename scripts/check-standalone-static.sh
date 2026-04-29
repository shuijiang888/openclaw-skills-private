#!/usr/bin/env bash
set -euo pipefail

# Ensure Next.js standalone has synchronized static assets, then verify
# a CSS chunk is reachable from the public base URL.
#
# Usage:
#   scripts/check-standalone-static.sh [base_url]
#
# Environment:
#   DEPLOY_SSH=root@host
#   DEPLOY_DIR=/opt/profit-web
#   AUTH_PASSWORD=111600

BASE_URL="${1:-${BASE_URL:-http://119.45.205.137}}"
DEPLOY_SSH="${DEPLOY_SSH:-root@119.45.205.137}"
DEPLOY_DIR="${DEPLOY_DIR:-/opt/profit-web}"
AUTH_PASS="${AUTH_PASSWORD:-111600}"

echo "[standalone-static] host=${DEPLOY_SSH} dir=${DEPLOY_DIR}"

ssh "${DEPLOY_SSH}" "bash -lc '
set -euo pipefail
cd \"${DEPLOY_DIR}\"

if [ ! -d .next/static ]; then
  echo \"[standalone-static] ERROR: .next/static missing\"
  exit 1
fi

mkdir -p .next/standalone/.next
rm -rf .next/standalone/.next/static
cp -a .next/static .next/standalone/.next/static

css_count=\$(ls .next/standalone/.next/static/chunks/*.css 2>/dev/null | wc -l | tr -d \" \")
if [ \"\${css_count}\" = \"0\" ]; then
  echo \"[standalone-static] ERROR: no CSS chunks in standalone static\"
  exit 1
fi
echo \"[standalone-static] OK css_count=\${css_count}\"
'"

tmp_home="$(mktemp)"
trap 'rm -f "${tmp_home}"' EXIT

cookie="$(
  curl -fsS -X POST "${BASE_URL}/api/auth/verify" \
    -H "content-type: application/json" \
    -d "{\"password\":\"${AUTH_PASS}\"}" \
    | python3 -c 'import json,sys; print((json.load(sys.stdin) or {}).get("cookie",""))'
)"

if [[ -z "${cookie}" ]]; then
  echo "[standalone-static] ERROR: failed to obtain gate cookie from ${BASE_URL}"
  exit 1
fi

curl -fsS "${BASE_URL}/" -H "Cookie: ai_platform_auth=${cookie}" > "${tmp_home}"

css_asset="$(
  python3 - "${tmp_home}" <<'PY'
import re, sys
path = sys.argv[1]
text = open(path, "r", encoding="utf-8", errors="ignore").read()
matches = re.findall(r'(?:href|src)=["\']([^"\']*/_next/static/chunks/[^"\']+\.css)["\']', text)
print(matches[0] if matches else "")
PY
)"

if [[ -z "${css_asset}" ]]; then
  echo "[standalone-static] ERROR: homepage did not reference any CSS chunk"
  exit 1
fi

asset_code="$(
  curl -sS -o /dev/null -w "%{http_code}" "${BASE_URL}${css_asset}"
)"
if [[ "${asset_code}" != "200" ]]; then
  echo "[standalone-static] ERROR: asset ${css_asset} returned ${asset_code}"
  exit 1
fi

echo "[standalone-static] OK asset ${css_asset} => 200"
