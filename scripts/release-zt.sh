#!/usr/bin/env bash
set -euo pipefail

# System-scoped release for ZT007 pages/APIs in monorepo.
# Usage:
#   scripts/release-zt.sh [branch]
# Example:
#   scripts/release-zt.sh cursor/agent-2fd9

BRANCH="${1:-$(git branch --show-current)}"
BASE_URL="${BASE_URL:-http://119.45.205.137}"
PAGE_PREFIX="${PAGE_PREFIX:-/profit}"
SKIP_SHA_GATE="${SKIP_SHA_GATE:-0}"
SKIP_BUILD="${SKIP_BUILD:-0}"
RUN_DB_PUSH="${RUN_DB_PUSH:-1}"

echo "[release-zt] branch=${BRANCH} base_url=${BASE_URL} page_prefix=${PAGE_PREFIX}"

echo "[release-zt] nginx whitelist guard"
bash scripts/check-nginx-whitelist.sh

echo "[release-zt] preflight build + gate + zt core apis"
SKIP_BUILD="${SKIP_BUILD}" bash scripts/release-preflight.sh "${BRANCH}" origin "${BASE_URL}"

echo "[release-zt] smoke zt scope"
bash scripts/smoke-zt.sh "${BASE_URL}" "${PAGE_PREFIX}"

if [[ "${RUN_DB_PUSH}" == "1" ]]; then
  echo "[release-zt] prisma db push for zt-related schema"
  npx prisma db push
fi

echo "[release-zt] push and deploy"
bash scripts/deploy-to-tencent.sh "${BRANCH}"

if [[ "${SKIP_SHA_GATE}" != "1" ]]; then
  echo "[release-zt] sha gate verify"
  bash scripts/verify-sha-gate.sh HEAD "${BRANCH}"
fi

echo "[release-zt] post-deploy zt smoke"
bash scripts/smoke-zt.sh "${BASE_URL}" "${PAGE_PREFIX}"

echo "[release-zt] done"
