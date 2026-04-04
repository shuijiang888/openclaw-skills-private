#!/usr/bin/env bash
set -euo pipefail

# Parallel preview helper:
# - old manufacturing baseline on 3000
# - CRM plugin branch on 3001
#
# Usage:
#   bash scripts/run-dual-preview.sh
#
# Optional env overrides:
#   OLD_BRANCH=main CRM_BRANCH=feature/fxiaoke-crm-agent OLD_PORT=3000 CRM_PORT=3001

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OLD_BRANCH="${OLD_BRANCH:-main}"
CRM_BRANCH="${CRM_BRANCH:-feature/fxiaoke-crm-agent}"
OLD_PORT="${OLD_PORT:-3000}"
CRM_PORT="${CRM_PORT:-3001}"

OLD_DIR="${ROOT_DIR}/.preview-old"
CRM_DIR="${ROOT_DIR}/.preview-crm"

echo "[dual-preview] root=${ROOT_DIR}"
echo "[dual-preview] old=${OLD_BRANCH} -> ${OLD_DIR} (port ${OLD_PORT})"
echo "[dual-preview] crm=${CRM_BRANCH} -> ${CRM_DIR} (port ${CRM_PORT})"

cd "${ROOT_DIR}"
git fetch origin "${OLD_BRANCH}" "${CRM_BRANCH}"

if ! git worktree list | rg -F "${OLD_DIR}" >/dev/null 2>&1; then
  git worktree add "${OLD_DIR}" "${OLD_BRANCH}"
fi

if ! git worktree list | rg -F "${CRM_DIR}" >/dev/null 2>&1; then
  git worktree add "${CRM_DIR}" "${CRM_BRANCH}"
fi

prepare_app() {
  local app_dir="$1"
  local db_file="$2"
  local port="$3"

  cd "${app_dir}"
  if [[ ! -f .env ]]; then
    cp .env.example .env
  fi

  python3 - "$db_file" <<'PY'
import pathlib, re, sys
db = sys.argv[1]
p = pathlib.Path(".env")
text = p.read_text(encoding="utf-8")
line = f'DATABASE_URL="file:./prisma/{db}"'
if re.search(r'^DATABASE_URL=.*$', text, flags=re.M):
    text = re.sub(r'^DATABASE_URL=.*$', line, text, flags=re.M)
else:
    text += ("\n" if not text.endswith("\n") else "") + line + "\n"
p.write_text(text, encoding="utf-8")
PY

  npm install
  npx prisma db push
  npm run db:seed
  echo "[dual-preview] prepared ${app_dir} on port ${port}"
}

prepare_app "${OLD_DIR}" "dev-old.db" "${OLD_PORT}"
prepare_app "${CRM_DIR}" "dev-crm.db" "${CRM_PORT}"

echo
echo "[dual-preview] start commands:"
echo "  (terminal A) cd \"${OLD_DIR}\" && npm run dev -- -p ${OLD_PORT}"
echo "  (terminal B) cd \"${CRM_DIR}\" && npm run dev -- -p ${CRM_PORT}"
echo
echo "[dual-preview] URLs:"
echo "  old: http://127.0.0.1:${OLD_PORT}"
echo "  crm: http://127.0.0.1:${CRM_PORT}"
echo "  crm seed pilot: http://127.0.0.1:${CRM_PORT}/console/seed-pilot"
