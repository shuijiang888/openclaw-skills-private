#!/usr/bin/env bash
# 将仓库内 openclaw/ 配置安装到本机 ~/.openclaw/（Mac / Linux）
# 用法：在包含 openclaw/ 目录的仓库根执行：bash openclaw/install-to-home.sh
# Hermes 若占用 18800：请勿把 OpenClaw 浏览器 CDP 改为 18800；本包使用 18802。

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST="${HOME}/.openclaw"
TS="$(date +%Y%m%d-%H%M%S)"

mkdir -p "${DEST}"
if [[ -f "${DEST}/openclaw.json" ]]; then
  cp "${DEST}/openclaw.json" "${DEST}/openclaw.json.bak.${TS}"
  echo "[install] backed up existing ~/.openclaw/openclaw.json -> openclaw.json.bak.${TS}"
fi

cp "${ROOT}/openclaw.json" "${DEST}/openclaw.json"
echo "[install] wrote ${DEST}/openclaw.json"

WS="${DEST}/workspace"
mkdir -p "${WS}/memory"
for f in AGENTS.md USER.md MEMORY.md HEARTBEAT.md; do
  if [[ ! -f "${WS}/${f}" ]]; then
    cp "${ROOT}/workspace-bootstrap/${f}" "${WS}/${f}"
    echo "[install] created ${WS}/${f}"
  else
    echo "[install] skip existing ${WS}/${f}"
  fi
done

echo ""
echo "Done. Next:"
echo "  1) Set env for MiniMax + embedding (e.g. OPENAI_API_KEY for memorySearch if using OpenAI embeddings)."
echo "  2) openclaw doctor --fix"
echo "  3) openclaw memory index --force --agent main   # if CLI supports"
echo "  4) openclaw gateway restart"
echo ""
echo "Ports: Gateway 18798 · OpenClaw browser CDP 18802 · leave Hermes on 18800 untouched."
