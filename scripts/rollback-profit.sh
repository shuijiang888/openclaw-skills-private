#!/usr/bin/env bash
set -euo pipefail

# Roll back deployment to a known safe commit/tag.
# Usage:
#   scripts/rollback-profit.sh [target_ref]
# Example:
#   scripts/rollback-profit.sh d9a757b_hotfix_backup

TARGET_REF="${1:-d9a757b_hotfix_backup}"
BASE_URL="${BASE_URL:-http://119.45.205.137}"
PAGE_PREFIX="${PAGE_PREFIX:-/profit}"
DEPLOY_SSH="${DEPLOY_SSH:-root@119.45.205.137}"
WORKTREE_DIR="${WORKTREE_DIR:-/opt/profit-web}"
BARE_GIT_DIR="${BARE_GIT_DIR:-/opt/git/profit-web.git}"

echo "[rollback-profit] target=${TARGET_REF}"

TARGET_SHA="$(git rev-parse "${TARGET_REF}^{commit}")"
echo "[rollback-profit] target sha=${TARGET_SHA}"

echo "[rollback-profit] reset remote worktree + bare ref"
ssh "${DEPLOY_SSH}" "git -C '${WORKTREE_DIR}' reset --hard '${TARGET_SHA}' && git --git-dir='${BARE_GIT_DIR}' update-ref refs/heads/main '${TARGET_SHA}'"

echo "[rollback-profit] verify sha gate"
CHECK_ORIGIN=0 bash scripts/verify-sha-gate.sh "${TARGET_SHA}" "$(git branch --show-current)"

echo "[rollback-profit] smoke profit scope"
bash scripts/smoke-profit.sh "${BASE_URL}" "${PAGE_PREFIX}"

echo "[rollback-profit] done"
