#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PLAYBOOK="$ROOT/collaboration/playbook.md"
STATUS="$ROOT/collaboration/STATUS.md"

err() { echo "check-collab: $*" >&2; exit 1; }

[[ -f "$PLAYBOOK" ]] || err "missing collaboration/playbook.md"

for heading in "目标对齐" "指令下发" "Cursor 执行" "过程管理" "质量与发布" "复盘"; do
  grep -q "^# ${heading}$" "$PLAYBOOK" || err "playbook.md missing heading: # ${heading}"
done

[[ -f "$STATUS" ]] || err "missing collaboration/STATUS.md"

grep -q "^task_id: collab-001" "$STATUS" || err "STATUS task_id must be collab-001"
grep -q "^state: done" "$STATUS" || err "STATUS state must be done (YAML block)"

echo "check-collab: OK"
