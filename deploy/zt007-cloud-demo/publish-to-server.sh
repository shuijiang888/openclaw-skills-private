#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   ./deploy/zt007-cloud-demo/publish-to-server.sh root@119.45.205.137
# Optional:
#   TARGET_DIR=/usr/share/nginx/html ./deploy/zt007-cloud-demo/publish-to-server.sh root@host

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <user@host>"
  exit 1
fi

SERVER="$1"
TARGET_DIR="${TARGET_DIR:-/usr/share/nginx/html}"
LOCAL_DIR="$(cd "$(dirname "$0")" && pwd)"
TMP_TAR="/tmp/zt007-cloud-demo.tar.gz"

echo "[1/4] Packing demo bundle..."
tar -C "$LOCAL_DIR" -czf "$TMP_TAR" .

echo "[2/4] Uploading bundle to ${SERVER}..."
scp "$TMP_TAR" "${SERVER}:/tmp/zt007-cloud-demo.tar.gz"

echo "[3/4] Publishing on server..."
ssh "$SERVER" "set -euo pipefail; \
  mkdir -p \"$TARGET_DIR\"; \
  tar -xzf /tmp/zt007-cloud-demo.tar.gz -C \"$TARGET_DIR\"; \
  chmod -R a+rX \"$TARGET_DIR\"; \
  nginx -t; \
  systemctl reload nginx; \
  rm -f /tmp/zt007-cloud-demo.tar.gz"

echo "[4/4] Done."
echo "Open: http://${SERVER#*@}/"
