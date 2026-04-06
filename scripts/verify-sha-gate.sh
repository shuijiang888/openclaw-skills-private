#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   scripts/verify-sha-gate.sh [expected_sha] [branch]
#
# Examples:
#   scripts/verify-sha-gate.sh
#   scripts/verify-sha-gate.sh d9a757b_hotfix_backup cursor/agent-2fd9
#
# Environment:
#   CHECK_ORIGIN=1|0           # default 1
#   DEPLOY_SSH=root@host       # default root@119.45.205.137
#   BARE_GIT_DIR=/opt/git/profit-web.git
#   WORKTREE_DIR=/opt/profit-web

EXPECTED_INPUT="${1:-HEAD}"
BRANCH="${2:-$(git branch --show-current)}"
CHECK_ORIGIN="${CHECK_ORIGIN:-1}"

DEPLOY_SSH="${DEPLOY_SSH:-root@119.45.205.137}"
BARE_GIT_DIR="${BARE_GIT_DIR:-/opt/git/profit-web.git}"
WORKTREE_DIR="${WORKTREE_DIR:-/opt/profit-web}"

if [[ "${EXPECTED_INPUT}" == "HEAD" ]]; then
  EXPECTED_SHA="$(git rev-parse HEAD)"
elif git rev-parse --verify "${EXPECTED_INPUT}^{commit}" >/dev/null 2>&1; then
  EXPECTED_SHA="$(git rev-parse "${EXPECTED_INPUT}^{commit}")"
elif [[ "${EXPECTED_INPUT}" =~ ^[0-9a-f]{7,40}$ ]]; then
  EXPECTED_SHA="${EXPECTED_INPUT}"
else
  echo "[sha-gate] ERROR: cannot resolve expected input '${EXPECTED_INPUT}'"
  exit 1
fi

echo "[sha-gate] expected sha: ${EXPECTED_SHA}"
echo "[sha-gate] branch: ${BRANCH}"

if [[ "${CHECK_ORIGIN}" == "1" ]]; then
  git fetch origin "${BRANCH}"
  ORIGIN_SHA="$(git rev-parse "origin/${BRANCH}")"
  echo "[sha-gate] origin/${BRANCH}: ${ORIGIN_SHA}"
  if [[ "${ORIGIN_SHA}" != "${EXPECTED_SHA}" ]]; then
    echo "[sha-gate] ERROR: expected sha != origin/${BRANCH}"
    exit 1
  fi
fi

BARE_SHA="$(ssh "${DEPLOY_SSH}" "git --git-dir='${BARE_GIT_DIR}' rev-parse main")"
WORKTREE_SHA="$(ssh "${DEPLOY_SSH}" "git -C '${WORKTREE_DIR}' rev-parse HEAD")"

echo "[sha-gate] bare main: ${BARE_SHA}"
echo "[sha-gate] worktree:  ${WORKTREE_SHA}"

if [[ "${BARE_SHA}" != "${EXPECTED_SHA}" ]] || [[ "${WORKTREE_SHA}" != "${EXPECTED_SHA}" ]]; then
  echo "[sha-gate] ERROR: SHA mismatch detected"
  echo "[sha-gate] HARD FAIL: block delivery until SHAs are identical"
  exit 1
fi

echo "[sha-gate] OK: expected/origin/bare/worktree are aligned"
