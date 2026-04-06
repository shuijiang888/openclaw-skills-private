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
TALKTRACK="$ROOT/collaboration/huichuan_sales_talktrack.md"
MD_DIR="$ROOT/collaboration/marketing_diagnosis"

err() { echo "check-collab: $*" >&2; exit 1; }

[[ -f "$PLAYBOOK" ]] || err "missing collaboration/playbook.md"

for heading in "目标对齐" "指令下发" "Cursor 执行" "过程管理" "质量与发布" "复盘"; do
  grep -q "^# ${heading}$" "$PLAYBOOK" || err "playbook.md missing heading: # ${heading}"
done

[[ -f "$STATUS" ]] || err "missing collaboration/STATUS.md"
grep -q "^task_id: collab-006" "$STATUS" || err "STATUS task_id must be collab-006"
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
grep -q "v1.4" "$CHANGELOG" || err "PROTOCOL_CHANGELOG missing v1.4"
grep -q "v1.5" "$CHANGELOG" || err "PROTOCOL_CHANGELOG missing v1.5"

[[ -f "$REPORT" ]] || err "missing collaboration/opportunity_insight_report.md"
[[ -s "$REPORT" ]] || err "opportunity_insight_report.md is empty"
for n in 一 二 三 四 五 六; do
  grep -q "^## ${n}、" "$REPORT" || err "report missing chapter heading: ## ${n}、"
done

[[ -f "$TALKTRACK" ]] || err "missing collaboration/huichuan_sales_talktrack.md"
[[ -s "$TALKTRACK" ]] || err "huichuan_sales_talktrack.md is empty"
for n in 一 二 三 四 五; do
  grep -q "^## ${n}、" "$TALKTRACK" || err "talktrack missing chapter heading: ## ${n}、"
done
grep -q "POC" "$TALKTRACK" || err "talktrack should mention POC/校准口径"
grep -q "授权" "$TALKTRACK" || err "talktrack should mention 授权校准口径"

[[ -d "$MD_DIR" ]] || err "missing collaboration/marketing_diagnosis/"
for f in reference_questionnaire questionnaire_design scoring_model report_template system_design user_flow; do
  [[ -f "$MD_DIR/${f}.md" ]] || err "missing collaboration/marketing_diagnosis/${f}.md"
  [[ -s "$MD_DIR/${f}.md" ]] || err "empty collaboration/marketing_diagnosis/${f}.md"
done
grep -q "wjx.cn" "$MD_DIR/reference_questionnaire.md" || err "reference should cite questionnaire URL"
grep -q "D1" "$MD_DIR/questionnaire_design.md" || err "questionnaire_design should tag dimensions"
grep -q "weighted" "$MD_DIR/scoring_model.md" || err "scoring_model should define weighting"
grep -q "{{total_score}}" "$MD_DIR/report_template.md" || err "report_template placeholders"
grep -q "Submit API" "$MD_DIR/system_design.md" || err "system_design API section"
grep -q "阶段 1" "$MD_DIR/user_flow.md" || err "user_flow stages"

echo "check-collab: OK"
