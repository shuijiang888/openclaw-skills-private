#!/usr/bin/env bash
set -euo pipefail

BRANCH="${1:-main}"
REMOTE="${2:-origin}"

echo "[preflight] current branch: $(git branch --show-current)"
echo "[preflight] target remote/branch: ${REMOTE}/${BRANCH}"

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

echo "[preflight] running build..."
npm run build

echo "[preflight] smoke checks (local dev/proxy path assumptions)"
for p in / /api/health /api/zt/overview /api/zt/action-cards /api/zt/bounty-tasks; do
  echo "  - expected route exists: ${p}"
done

echo "[preflight] OK"
