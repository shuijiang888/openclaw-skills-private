#!/usr/bin/env bash
set -euo pipefail

# Deploy ONLY from GitHub `origin/main` to keep SHA consistent
# between the private repo main branch and the server deploy SHA.
#
# Usage:
#   scripts/deploy-to-tencent.sh [ref]
# Examples:
#   scripts/deploy-to-tencent.sh            # deploy origin/main (recommended)
#   scripts/deploy-to-tencent.sh origin/main
#   scripts/deploy-to-tencent.sh main       # deploy local main if it matches origin/main

REF="${1:-origin/main}"
REMOTE_URL="root@119.45.205.137:/opt/git/profit-web.git"
DEPLOY_SSH="${DEPLOY_SSH:-root@119.45.205.137}"
DEPLOY_DIR="${DEPLOY_DIR:-/opt/profit-web}"
CHECK_STANDALONE_STATIC="${CHECK_STANDALONE_STATIC:-1}"

echo "[deploy] deploy ref: ${REF}"
echo "[deploy] push target: ${REMOTE_URL} main"

echo "[deploy] fetch origin/main"
git fetch origin main

ORIGIN_MAIN_SHA="$(git rev-parse origin/main)"

if [[ "${REF}" == "origin/main" ]]; then
  echo "[deploy] origin/main sha: ${ORIGIN_MAIN_SHA}"
  git push "${REMOTE_URL}" "origin/main:main"
else
  REF_SHA="$(git rev-parse "${REF}")"
  if [[ "${REF_SHA}" != "${ORIGIN_MAIN_SHA}" ]]; then
    echo "[deploy] ERROR: ref ${REF} (${REF_SHA}) != origin/main (${ORIGIN_MAIN_SHA})"
    echo "[deploy] Refusing to deploy non-origin/main to keep SHA consistent."
    exit 1
  fi
  echo "[deploy] ref sha matches origin/main: ${REF_SHA}"
  git push "${REMOTE_URL}" "${REF}:main"
fi

if [[ "${CHECK_STANDALONE_STATIC}" == "1" ]]; then
  echo "[deploy] standalone static gate sync + verify"
  ssh "${DEPLOY_SSH}" "cd '${DEPLOY_DIR}' && mkdir -p .next/standalone/.next && rm -rf .next/standalone/.next/static && cp -a .next/static .next/standalone/.next/static"
  bash scripts/check-standalone-static.sh
fi

echo "[deploy] done. validate with:"
echo "  curl -sS -o /dev/null -w '%{http_code}\\n' http://119.45.205.137/profit/dashboard"
echo "  curl -sS -o /dev/null -w '%{http_code}\\n' http://119.45.205.137/profit/projects"
echo "  curl -sS -o /dev/null -w '%{http_code}\\n' http://119.45.205.137/profit/zt007"
