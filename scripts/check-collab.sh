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
H5_MVP="$ROOT/collaboration/marketing_diagnosis/mvp/h5_questionnaire.html"
SYS_DIR="$ROOT/collaboration/marketing_diagnosis/system"

err() { echo "check-collab: $*" >&2; exit 1; }

[[ -f "$PLAYBOOK" ]] || err "missing collaboration/playbook.md"

for heading in "目标对齐" "指令下发" "Cursor 执行" "过程管理" "质量与发布" "复盘"; do
  grep -q "^# ${heading}$" "$PLAYBOOK" || err "playbook.md missing heading: # ${heading}"
done

[[ -f "$STATUS" ]] || err "missing collaboration/STATUS.md"
grep -q "^task_id: collab-009" "$STATUS" || err "STATUS task_id must be collab-009"
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
grep -q "v1.6" "$CHANGELOG" || err "PROTOCOL_CHANGELOG missing v1.6"
grep -q "v1.7" "$CHANGELOG" || err "PROTOCOL_CHANGELOG missing v1.7"
grep -q "v1.8" "$CHANGELOG" || err "PROTOCOL_CHANGELOG missing v1.8"

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

[[ -f "$H5_MVP" ]] || err "missing mvp/h5_questionnaire.html"
[[ -s "$H5_MVP" ]] || err "empty mvp/h5_questionnaire.html"
grep -q "computeScores" "$H5_MVP" || err "h5 must contain scoring engine"
grep -q "viewport" "$H5_MVP" || err "h5 must set viewport"
grep -q "drawRadar" "$H5_MVP" || err "h5 must draw SVG radar"
grep -q "html2pdf" "$H5_MVP" || err "h5 must reference html2pdf"
grep -q "var CONFIG" "$H5_MVP" || err "h5 must expose CONFIG"
grep -q "basic-name-inp" "$H5_MVP" || err "h5 must have QB1 company field"
grep -q "TOTAL_STEPS = 30" "$H5_MVP" || err "h5 must use 30 steps"
grep -q "report-page" "$H5_MVP" || err "h5 report-page for PDF"

[[ -d "$SYS_DIR" ]] || err "missing marketing_diagnosis/system/"
for f in openapi_integration database_schema backend_api_design deployment_guide crm_workflow; do
  [[ -f "$SYS_DIR/${f}.md" ]] || err "missing system/${f}.md"
  [[ -s "$SYS_DIR/${f}.md" ]] || err "empty system/${f}.md"
done
grep -q "待老江" "$SYS_DIR/openapi_integration.md" || err "openapi needs 待确认 section"
grep -q "CREATE TABLE campaigns" "$SYS_DIR/database_schema.md" || err "schema needs campaigns"
grep -q "crm_sync_log" "$SYS_DIR/database_schema.md" || err "schema needs crm_sync_log"
grep -q "POST /api/v1/submissions" "$SYS_DIR/backend_api_design.md" || err "api needs submissions"
grep -q "GenerateReportJob" "$SYS_DIR/backend_api_design.md" || err "api needs async jobs"
grep -q "119.45.205.137" "$SYS_DIR/deployment_guide.md" || err "deploy needs server IP"
grep -q "location /diag/" "$SYS_DIR/deployment_guide.md" || err "deploy needs nginx diag"
grep -q "utm_sales" "$SYS_DIR/crm_workflow.md" || err "crm workflow needs utm"

echo "check-collab: OK"
