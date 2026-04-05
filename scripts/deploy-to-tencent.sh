#!/usr/bin/env bash
set -euo pipefail

# Push current branch to Tencent bare repo main to trigger post-receive auto deploy.
# Usage:
#   scripts/deploy-to-tencent.sh [branch]
# Example:
#   scripts/deploy-to-tencent.sh cursor/agent-2fd9

BRANCH="${1:-$(git branch --show-current)}"
REMOTE_URL="root@119.45.205.137:/root/profit-web.git"

echo "[deploy] local branch: ${BRANCH}"
echo "[deploy] push target: ${REMOTE_URL} main"

git push "${REMOTE_URL}" "${BRANCH}:main"

echo "[deploy] done. validate with:"
echo "  curl -sS -o /dev/null -w '%{http_code}\\n' http://119.45.205.137/profit/dashboard"
echo "  curl -sS -o /dev/null -w '%{http_code}\\n' http://119.45.205.137/profit/projects"
echo "  curl -sS -o /dev/null -w '%{http_code}\\n' http://119.45.205.137/profit/zt007"
