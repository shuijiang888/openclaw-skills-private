#!/usr/bin/env bash
set -euo pipefail

BRANCH="${1:-main}"
REMOTE="${2:-origin}"
BASE_URL="${3:-http://127.0.0.1:3000}"
PASS="${AUTH_PASSWORD:-111600}"
SKIP_BUILD="${SKIP_BUILD:-0}"

echo "[preflight] current branch: $(git branch --show-current)"
echo "[preflight] target remote/branch: ${REMOTE}/${BRANCH}"
echo "[preflight] base url: ${BASE_URL}"

git fetch "${REMOTE}" "${BRANCH}"

LOCAL_SHA="$(git rev-parse --short HEAD)"
REMOTE_SHA="$(git rev-parse --short "${REMOTE}/${BRANCH}")"
echo "[preflight] local sha=${LOCAL_SHA} remote sha=${REMOTE_SHA}"

if ! git merge-base --is-ancestor "${REMOTE}/${BRANCH}" HEAD; then
  echo "[preflight] ERROR: current HEAD does not include ${REMOTE}/${BRANCH}"
  exit 1
fi

if ! git diff --quiet; then
  echo "[preflight] ERROR: working tree is dirty"
  git status -sb
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "[preflight] ERROR: curl is required"
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "[preflight] ERROR: jq is required"
  exit 1
fi

if [[ "${SKIP_BUILD}" != "1" ]]; then
  echo "[preflight] running build..."
  npm run build
else
  echo "[preflight] SKIP_BUILD=1, build skipped"
fi

tmp_cookie="$(mktemp)"
trap 'rm -f "$tmp_cookie"' EXIT

echo "[preflight] gate auth verify..."
curl -fsS -c "$tmp_cookie" -X POST "${BASE_URL}/api/auth/verify" \
  -H "content-type: application/json" \
  -d "{\"password\":\"${PASS}\"}" >/dev/null

echo "[preflight] smoke checks..."
declare -a CHECK_PATHS=(
  "/"
  "/api/health"
  "/api/zt/overview"
  "/api/zt/action-cards"
  "/api/zt/bounty-tasks"
  "/api/zt/strategist/snapshot"
  "/api/zt/monitoring"
  "/api/zt/monitoring/history?limit=5"
  "/api/zt/linkage"
)

for p in "${CHECK_PATHS[@]}"; do
  code="$(curl -sS -o /tmp/preflight_check.json -w "%{http_code}" \
    -b "$tmp_cookie" \
    -H "x-demo-role: ADMIN" \
    "${BASE_URL}${p}")"
  if [[ "$code" != "200" ]]; then
    echo "[preflight] ERROR: ${p} expected 200, got ${code}"
    cat /tmp/preflight_check.json || true
    exit 1
  fi
  echo "  - ${p} OK"
done

echo "[preflight] monitoring gate..."
curl -fsS -b "$tmp_cookie" -H "x-demo-role: ADMIN" \
  "${BASE_URL}/api/zt/monitoring" \
  | jq -e '.status != "critical"' >/dev/null

echo "[preflight] OK"
