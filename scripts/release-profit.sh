#!/usr/bin/env bash
set -euo pipefail

# System-scoped release for Profit pages/APIs in monorepo.
# Usage:
#   scripts/release-profit.sh [branch]
# Example:
#   scripts/release-profit.sh cursor/agent-2fd9

BRANCH="${1:-$(git branch --show-current)}"
BASE_URL="${BASE_URL:-http://119.45.205.137}"
PAGE_PREFIX="${PAGE_PREFIX:-/profit}"
SKIP_SHA_GATE="${SKIP_SHA_GATE:-0}"
SKIP_NGINX_CHECK="${SKIP_NGINX_CHECK:-0}"
SKIP_BUILD="${SKIP_BUILD:-0}"
DEPLOY_CMD="${DEPLOY_CMD:-bash scripts/deploy-to-tencent.sh \"${BRANCH}\"}"

echo "[release-profit] branch=${BRANCH} base_url=${BASE_URL} page_prefix=${PAGE_PREFIX}"

echo "[release-profit] preflight build + gate + core APIs"
SKIP_BUILD="${SKIP_BUILD}" bash scripts/release-preflight.sh "${BRANCH}" origin "${BASE_URL}"

echo "[release-profit] smoke profit scope"
bash scripts/smoke-profit.sh "${BASE_URL}" "${PAGE_PREFIX}"

if [[ "${SKIP_NGINX_CHECK}" != "1" ]]; then
  echo "[release-profit] nginx whitelist gate"
  bash scripts/check-nginx-whitelist.sh
fi

echo "[release-profit] push and deploy"
eval "${DEPLOY_CMD}"

if [[ "${SKIP_SHA_GATE}" != "1" ]]; then
  echo "[release-profit] sha gate verify"
  bash scripts/verify-sha-gate.sh HEAD "${BRANCH}"
fi

echo "[release-profit] post-deploy profit smoke"
bash scripts/smoke-profit.sh "${BASE_URL}" "${PAGE_PREFIX}"

echo "[release-profit] done"
