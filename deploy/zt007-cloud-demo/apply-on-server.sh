#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="/opt/zhitan007-system-demo"
SITE_ROOT="${APP_ROOT}/site"
ARCHIVE="${APP_ROOT}/release.tar.gz"
NGINX_ROOT="/usr/share/nginx/html"
NGINX_CONF="/etc/nginx/conf.d/00-zhitan-demo.conf"

echo "==> Prepare directories"
mkdir -p "${APP_ROOT}" "${SITE_ROOT}"

if [[ ! -f "${ARCHIVE}" ]]; then
  echo "Archive not found: ${ARCHIVE}"
  exit 1
fi

echo "==> Extract release package"
rm -rf "${SITE_ROOT:?}"/*
tar -xzf "${ARCHIVE}" -C "${SITE_ROOT}"

echo "==> Publish to nginx html root"
mkdir -p "${NGINX_ROOT}"
cp -rf "${SITE_ROOT}"/* "${NGINX_ROOT}/"

echo "==> Apply nginx config for IP/default access"
cat > "${NGINX_CONF}" <<'EOF'
server {
    listen 80 default_server;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF

echo "==> Reload nginx"
nginx -t
systemctl reload nginx

echo "==> Smoke test"
curl -sI http://127.0.0.1/ | head -n 1
curl -sI http://127.0.0.1/assets/style.css | head -n 1

echo "Done. Demo is live on server IP."
