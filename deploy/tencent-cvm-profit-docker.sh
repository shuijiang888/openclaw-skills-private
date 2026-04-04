#!/usr/bin/env bash
# 在腾讯云 CVM 上执行：构建并运行制造业盈利管理系统（含 /portal 统一门户）
# 用法：
#   chmod +x deploy/tencent-cvm-profit-docker.sh
#   # 先复制并编辑环境文件
#   cp deploy/tencent-cvm-profit.env.example deploy/tencent-cvm-profit.env
#   nano deploy/tencent-cvm-profit.env
#   source deploy/tencent-cvm-profit.env && ./deploy/tencent-cvm-profit-docker.sh
#
# 依赖：Docker（docker build / run）。SQLite 数据目录须与 DATABASE_URL 中路径一致并挂载到容器。

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE="${ENV_FILE:-$ROOT_DIR/deploy/tencent-cvm-profit.env}"
if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

: "${PROFIT_AUTH_SECRET:?请在 env 中设置 PROFIT_AUTH_SECRET（≥16 字符）}"
: "${DATABASE_URL:?请在 env 中设置 DATABASE_URL，例如 file:./prisma/prod.db}"

IMAGE_NAME="${IMAGE_NAME:-profit-web}"
CONTAINER_NAME="${CONTAINER_NAME:-profit-web}"
HOST_PORT="${HOST_PORT:-3000}"

INTEL_URL="${NEXT_PUBLIC_PORTAL_APP_INTELLIGENCE_URL:-/intel/}"
NEXT_PUBLIC_PROFIT_AUTH_MODE="${NEXT_PUBLIC_PROFIT_AUTH_MODE:-session}"

echo ">>> 构建镜像（NEXT_PUBLIC_* 在此阶段写入前端资源）"
docker build \
  --build-arg "NEXT_PUBLIC_PROFIT_AUTH_MODE=${NEXT_PUBLIC_PROFIT_AUTH_MODE}" \
  --build-arg "NEXT_PUBLIC_PORTAL_APP_INTELLIGENCE_URL=${INTEL_URL}" \
  -t "${IMAGE_NAME}" .

echo ">>> 停止并移除旧容器（若存在）"
docker rm -f "${CONTAINER_NAME}" 2>/dev/null || true

echo ">>> 启动容器（数据目录挂载 ./prisma → /app/prisma）"
docker run -d \
  --name "${CONTAINER_NAME}" \
  --restart unless-stopped \
  -p "${HOST_PORT}:3000" \
  -e "NODE_ENV=production" \
  -e "DATABASE_URL=${DATABASE_URL}" \
  -e "PROFIT_AUTH_MODE=session" \
  -e "NEXT_PUBLIC_PROFIT_AUTH_MODE=${NEXT_PUBLIC_PROFIT_AUTH_MODE}" \
  -e "PROFIT_AUTH_SECRET=${PROFIT_AUTH_SECRET}" \
  -e "PROFIT_ROOT_REDIRECT=${PROFIT_ROOT_REDIRECT:-portal}" \
  -v "${ROOT_DIR}/prisma:/app/prisma" \
  "${IMAGE_NAME}"

echo ">>> 探活（容器内需几秒启动）"
sleep 2
curl -sS -o /dev/null -w "%{http_code}" "http://127.0.0.1:${HOST_PORT}/api/health" || true
echo
echo "完成。本机: http://127.0.0.1:${HOST_PORT}/portal"
echo "若经 Nginx 对外，请将反代指向上游 127.0.0.1:${HOST_PORT}，并放行安全组端口。"
