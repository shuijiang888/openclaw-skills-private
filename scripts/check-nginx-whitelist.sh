#!/usr/bin/env bash
set -euo pipefail

# Verify server-side nginx route whitelist includes required profit paths.
# Usage:
#   scripts/check-nginx-whitelist.sh
#
# Environment:
#   DEPLOY_SSH=root@host
#   NGINX_CONF=/etc/nginx/default.d/profit-web.conf

DEPLOY_SSH="${DEPLOY_SSH:-root@119.45.205.137}"
NGINX_CONF="${NGINX_CONF:-/etc/nginx/default.d/profit-web.conf}"

REQUIRED_TOKENS=(
  "data-screen"
  "console/users"
  "console/system"
)

echo "[nginx-whitelist] host=${DEPLOY_SSH} conf=${NGINX_CONF}"

CONF_CONTENT="$(ssh "${DEPLOY_SSH}" "test -f '${NGINX_CONF}' && sed -n '1,220p' '${NGINX_CONF}'")"
if [[ -z "${CONF_CONTENT}" ]]; then
  echo "[nginx-whitelist] ERROR: nginx config not found or empty: ${NGINX_CONF}"
  exit 1
fi

for token in "${REQUIRED_TOKENS[@]}"; do
  if [[ "${CONF_CONTENT}" != *"${token}"* ]]; then
    echo "[nginx-whitelist] ERROR: missing token '${token}' in ${NGINX_CONF}"
    exit 1
  fi
  echo "[nginx-whitelist] OK token '${token}'"
done

echo "[nginx-whitelist] passed"
