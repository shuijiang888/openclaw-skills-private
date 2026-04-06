# Protocol 变更日志

## v1.0（collab-001 前）

- 初始约定：`HANDOFF` + `STATUS` + `check-collab.sh`

## v1.1（collab-002 后）

- 新增：`TEMPLATE.md` 标准任务模板
- 改进：复盘机制，Cursor 每轮可在 `retrospectives/` 留档
- 改进：`CURRENT_TASK.md` 保持纯叙述；YAML 运行态只在 `STATUS.md`

## v1.2（collab-003）

- 新增：`HEALTH_CHECKLIST.md` 交接质量门禁（OpenClaw 写 HANDOFF 前自检）
- 新增：本变更日志，协议演进可追踪
- 目标：减少模糊 DoD、边界遗漏与返工

## v1.3（collab-004）

- 改进：`CURRENT_TASK.md` 保持纯人类可读叙述，不含 YAML 状态块
- 改进：写 HANDOFF 前先过 HEALTH_CHECKLIST（必填项必填）
- 新增：collab-004 引入真实业务任务，验证协议对复杂场景的承载能力
