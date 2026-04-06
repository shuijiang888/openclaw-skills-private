#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PLAYBOOK="$ROOT/collaboration/playbook.md"
STATUS="$ROOT/collaboration/STATUS.md"
RETRO="$ROOT/collaboration/retrospectives/collab-001-20260406.md"
TEMPLATE="$ROOT/collaboration/TEMPLATE.md"
HEALTH="$ROOT/collaboration/HEALTH_CHECKLIST.md"
CHANGELOG="$ROOT/collaboration/PROTOCOL_CHANGELOG.md"
REPORT="$ROOT/collaboration/opportunity_insight_report.md"

err() { echo "check-collab: $*" >&2; exit 1; }

[[ -f "$PLAYBOOK" ]] || err "missing collaboration/playbook.md"

for heading in "目标对齐" "指令下发" "Cursor 执行" "过程管理" "质量与发布" "复盘"; do
  grep -q "^# ${heading}$" "$PLAYBOOK" || err "playbook.md missing heading: # ${heading}"
done

[[ -f "$STATUS" ]] || err "missing collaboration/STATUS.md"
grep -q "^task_id: collab-004" "$STATUS" || err "STATUS task_id must be collab-004"
grep -q "^state: done" "$STATUS" || err "STATUS state must be done (YAML block)"

[[ -f "$RETRO" ]] || err "missing collaboration/retrospectives/collab-001-20260406.md"
[[ -s "$RETRO" ]] || err "retro collab-001 file is empty"
grep -q "collab-002 新增发现" "$RETRO" || err "retro missing collab-002 追加段落"

[[ -f "$TEMPLATE" ]] || err "missing collaboration/TEMPLATE.md"
grep -q "完成定义" "$TEMPLATE" || err "TEMPLATE.md must contain 完成定义 section"
grep -q "验收步骤" "$TEMPLATE" || err "TEMPLATE.md must contain 验收步骤 section"
grep -q "非目标" "$TEMPLATE" || err "TEMPLATE.md must contain 非目标 section"

[[ -f "$HEALTH" ]] || err "missing collaboration/HEALTH_CHECKLIST.md"
grep -q "必填项" "$HEALTH" || err "HEALTH_CHECKLIST missing 必填项 section"
grep -q "推荐项" "$HEALTH" || err "HEALTH_CHECKLIST missing 推荐项 section"

[[ -f "$CHANGELOG" ]] || err "missing collaboration/PROTOCOL_CHANGELOG.md"
grep -q "v1.0" "$CHANGELOG" || err "PROTOCOL_CHANGELOG missing v1.0"
grep -q "v1.1" "$CHANGELOG" || err "PROTOCOL_CHANGELOG missing v1.1"
grep -q "v1.2" "$CHANGELOG" || err "PROTOCOL_CHANGELOG missing v1.2"

[[ -f "$REPORT" ]] || err "missing collaboration/opportunity_insight_report.md"
[[ -s "$REPORT" ]] || err "opportunity_insight_report.md is empty"
for n in 一 二 三 四 五 六; do
  grep -q "^## ${n}、" "$REPORT" || err "report missing chapter heading: ## ${n}、"
done

echo "check-collab: OK"
