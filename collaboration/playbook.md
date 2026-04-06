# 目标对齐

- OpenClaw（经小江）在 `CURRENT_TASK.md` 写清背景、DoD、非目标；老江拍板范围。
- Cursor 不自行扩大需求；与文件不一致时在 `decisions-needed/` 提出。

# 指令下发

- OpenClaw 只通过 `HANDOFF.md` 下发可执行步骤与验收；**聊天不替代 HANDOFF**。
- 每一轮有明确 `task_id`，与 `STATUS.md` YAML 对齐。

# Cursor 执行

- 以 `CURRENT_TASK.md` + `HANDOFF.md` 为唯一任务来源，按文件实现与自检。
- 完成后更新 `STATUS.md`（`state`、`last_step`、`blocker`），产物可放 `cursor-out/`（若需要）。

# 过程管理

- 进度与阻塞只写在 `STATUS.md`；需要人类决策时写 `decisions-needed/`。
- 小江可对照本 playbook 做流程与安全守门。

# 质量与发布

- 默认以 `HANDOFF` / `CURRENT_TASK` 所列命令与检查为准；本仓库基线为 `./scripts/check-collab.sh`。
- 合并与发布策略遵循团队规范（如唯一发布分支），不在本演练场擅自放宽。

# 复盘

- 任务闭环后由 OpenClaw/小江汇总：读 `STATUS`、diff、验收结果，写入 `collaboration/retrospectives/`。
- 下一轮更新 `task_id` 并重写 `HANDOFF.md` / `CURRENT_TASK.md`。
