#!/usr/bin/env bash
set -euo pipefail

# Push current branch to Tencent bare repo main to trigger post-receive auto deploy.
# Usage:
#   scripts/deploy-to-tencent.sh [branch]
# Example:
#   scripts/deploy-to-tencent.sh cursor/agent-2fd9

BRANCH="${1:-$(git branch --show-current)}"
REMOTE_URL="root@119.45.205.137:/opt/git/profit-web.git"
DEPLOY_SSH="${DEPLOY_SSH:-root@119.45.205.137}"
DEPLOY_DIR="${DEPLOY_DIR:-/opt/profit-web}"
CHECK_STANDALONE_STATIC="${CHECK_STANDALONE_STATIC:-1}"

echo "[deploy] local branch: ${BRANCH}"
echo "[deploy] push target: ${REMOTE_URL} main"

git push "${REMOTE_URL}" "${BRANCH}:main"

if [[ "${CHECK_STANDALONE_STATIC}" == "1" ]]; then
  echo "[deploy] standalone static gate sync + verify"
  ssh "${DEPLOY_SSH}" "cd '${DEPLOY_DIR}' && mkdir -p .next/standalone/.next && rm -rf .next/standalone/.next/static && cp -a .next/static .next/standalone/.next/static"
  bash scripts/check-standalone-static.sh
fi

echo "[deploy] done. validate with:"
echo "  curl -sS -o /dev/null -w '%{http_code}\\n' http://119.45.205.137/profit/dashboard"
echo "  curl -sS -o /dev/null -w '%{http_code}\\n' http://119.45.205.137/profit/projects"
echo "  curl -sS -o /dev/null -w '%{http_code}\\n' http://119.45.205.137/profit/zt007"
