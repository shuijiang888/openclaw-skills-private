#!/usr/bin/env bash
#
# 一键部署（腾讯云 CVM）：盈利 Docker + /intel 占位 + Nginx 合并配置
#
# 用法（必须 root，整行复制，只改邮箱和密码）：
#   cd /opt/profit-web && git pull && sudo bash deploy/one-click-setup.sh '你的邮箱@qq.com' '你的登录密码'
#
# 依赖：Docker、Nginx（常见 CVM 已装）；若无 Node 则用临时容器跑 Prisma（脚本内已处理）
#
set -euo pipefail

if [[ "${EUID:-0}" -ne 0 ]]; then
  echo "请用 root 执行，例如：sudo bash deploy/one-click-setup.sh '邮箱' '密码'"
  exit 1
fi

EMAIL="${1:-}"
PASSWORD="${2:-}"
if [[ -z "$EMAIL" || -z "$PASSWORD" ]]; then
  echo "用法: sudo bash deploy/one-click-setup.sh '邮箱' '密码'"
  exit 1
fi
if [[ "$PASSWORD" == *"'"* ]]; then
  echo "密码里请不要包含英文单引号 ' ，请换一个密码。"
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v docker >/dev/null 2>&1; then
  echo "未检测到 docker，请先在服务器安装 Docker 后再运行本脚本。"
  exit 1
fi

if ! command -v nginx >/dev/null 2>&1; then
  echo "未检测到 nginx，请先安装 nginx 后再运行本脚本。"
  exit 1
fi

ENV_FILE="$ROOT_DIR/deploy/tencent-cvm-profit.env"
if [[ ! -f "$ENV_FILE" ]]; then
  cp "$ROOT_DIR/deploy/tencent-cvm-profit.env.example" "$ENV_FILE"
fi

# 若未配置有效密钥则自动生成并写入（示例里的中文占位不算）
SECRET_LINE="$(grep '^PROFIT_AUTH_SECRET=' "$ENV_FILE" 2>/dev/null | head -1 || true)"
SECRET_VAL="${SECRET_LINE#PROFIT_AUTH_SECRET=}"
if [[ ${#SECRET_VAL} -lt 16 ]] || [[ "$SECRET_VAL" == *请* ]]; then
  SECRET="$(openssl rand -hex 24 2>/dev/null || (head -c 24 /dev/urandom | base64 | tr -dc 'a-zA-Z0-9' | head -c 32))"
  if grep -q '^PROFIT_AUTH_SECRET=' "$ENV_FILE"; then
    sed -i "s/^PROFIT_AUTH_SECRET=.*/PROFIT_AUTH_SECRET=${SECRET}/" "$ENV_FILE"
  else
    echo "PROFIT_AUTH_SECRET=${SECRET}" >> "$ENV_FILE"
  fi
  echo ">>> 已自动生成 PROFIT_AUTH_SECRET 并写入 $ENV_FILE"
fi

sed -i 's/\r$//' "$ENV_FILE" 2>/dev/null || true

export ENV_FILE
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

: "${PROFIT_AUTH_SECRET:?env 中 PROFIT_AUTH_SECRET 无效}"
: "${DATABASE_URL:?env 中 DATABASE_URL 缺失}"

BACKUP_ROOT="/root/profit-web-nginx-backup-$(date +%Y%m%d-%H%M%S)"
echo ">>> 备份 Nginx 与 html 到 $BACKUP_ROOT"
mkdir -p "$BACKUP_ROOT"
cp -a /etc/nginx "$BACKUP_ROOT/nginx-etc" 2>/dev/null || true
cp -a /usr/share/nginx/html "$BACKUP_ROOT/html" 2>/dev/null || true
echo "$BACKUP_ROOT" > /root/profit-web-LAST-BACKUP.txt

echo ">>> 初始化数据库与管理员（邮箱: $EMAIL）"
prisma_via_docker() {
  docker run --rm \
    -e EMAIL="$EMAIL" \
    -e PASS="$PASSWORD" \
    -v "$ROOT_DIR:/app" \
    -w /app \
    -e DATABASE_URL="$DATABASE_URL" \
    node:22-bookworm-slim \
    bash -lc 'apt-get update -y -qq && apt-get install -y -qq openssl >/dev/null && npm ci --silent && npx prisma generate && npx prisma db push && npx tsx prisma/create-user.ts "$EMAIL" "$PASS" ADMIN'
}

if command -v npm >/dev/null 2>&1; then
  npm ci --silent
  npx prisma generate
  npx prisma db push
  npx tsx prisma/create-user.ts "$EMAIL" "$PASSWORD" ADMIN
else
  prisma_via_docker
fi

# 容器内 nextjs 用户 uid 1001 需写 SQLite
mkdir -p "$ROOT_DIR/prisma"
chown -R 1001:1001 "$ROOT_DIR/prisma" || true

echo ">>> 构建并启动盈利容器"
chmod +x "$ROOT_DIR/deploy/tencent-cvm-profit-docker.sh"
bash "$ROOT_DIR/deploy/tencent-cvm-profit-docker.sh"

echo ">>> 情报目录占位（正式情报包以后覆盖 /usr/share/nginx/html/intel/ 即可）"
mkdir -p /usr/share/nginx/html/intel
cp "$ROOT_DIR/deploy/intel-placeholder.html" /usr/share/nginx/html/intel/index.html

echo ">>> 切换 Nginx（禁用旧 default，启用统一入口）"
disable_old() {
  local f
  for f in /etc/nginx/conf.d/default.conf /etc/nginx/sites-enabled/default; do
    if [[ -f "$f" ]]; then
      mv "$f" "${f}.disabled-by-profit"
      echo "    已禁用: $f"
    fi
  done
}
disable_old

cp "$ROOT_DIR/deploy/nginx-unified-portal.conf" /etc/nginx/conf.d/99-unified-portal.conf

if ! nginx -t 2>/tmp/nginx-test.err; then
  if grep -q '\[::\]' /tmp/nginx-test.err 2>/dev/null; then
    echo ">>> 检测到 IPv6 配置问题，已自动去掉 [::]:80"
    sed -i '/listen \[::\]:80/d' /etc/nginx/conf.d/99-unified-portal.conf
  fi
  nginx -t
fi

systemctl reload nginx

echo ""
echo "========== 完成 =========="
echo "1. 浏览器打开: http://$(hostname -I 2>/dev/null | awk '{print $1}' || echo '你的服务器IP')/portal"
echo "2. 用刚才的邮箱和密码登录"
echo "3. 情报为占位页；正式包覆盖目录: /usr/share/nginx/html/intel/"
echo "4. 若需回滚: 见 /root/profit-web-LAST-BACKUP.txt 里的备份路径"
echo "=========================="
