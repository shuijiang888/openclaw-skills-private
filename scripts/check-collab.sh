#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PLAYBOOK="$ROOT/collaboration/playbook.md"
STATUS="$ROOT/collaboration/STATUS.md"
RETRO="$ROOT/collaboration/retrospectives/collab-001-20260406.md"
TEMPLATE="$ROOT/collaboration/TEMPLATE.md"

err() { echo "check-collab: $*" >&2; exit 1; }

[[ -f "$PLAYBOOK" ]] || err "missing collaboration/playbook.md"

for heading in "目标对齐" "指令下发" "Cursor 执行" "过程管理" "质量与发布" "复盘"; do
  grep -q "^# ${heading}$" "$PLAYBOOK" || err "playbook.md missing heading: # ${heading}"
done

[[ -f "$STATUS" ]] || err "missing collaboration/STATUS.md"
grep -q "^task_id: collab-002" "$STATUS" || err "STATUS task_id must be collab-002"
grep -q "^state: done" "$STATUS" || err "STATUS state must be done (YAML block)"

[[ -f "$RETRO" ]] || err "missing collaboration/retrospectives/collab-001-20260406.md"
[[ -s "$RETRO" ]] || err "retro collab-001 file is empty"

[[ -f "$TEMPLATE" ]] || err "missing collaboration/TEMPLATE.md"
grep -q "完成定义" "$TEMPLATE" || err "TEMPLATE.md must contain 完成定义 section"
grep -q "验收步骤" "$TEMPLATE" || err "TEMPLATE.md must contain 验收步骤 section"
grep -q "非目标" "$TEMPLATE" || err "TEMPLATE.md must contain 非目标 section"

echo "check-collab: OK"
