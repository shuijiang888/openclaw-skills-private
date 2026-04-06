# OpenClaw ↔ Cursor 协作演练场

本仓库用于**打磨交接协议**：OpenClaw 统筹目标与验收，Cursor 在本地 Agent 中执行实现。

## 快速开始

1. 用 OpenClaw 讨论目标，由它更新 `collaboration/CURRENT_TASK.md` 与 `collaboration/HANDOFF.md`。
2. 在 Cursor 中打开本仓库，**本地 Agent** 首条消息引用：「按 `collaboration/HANDOFF.md` 执行，遵守 `AGENTS.md`。」
3. 执行中只通过 `collaboration/STATUS.md` 与 `collaboration/decisions-needed/` 同步状态与待决策项。
4. 自检：`./scripts/check-collab.sh`；通过后把 `STATUS.md` 中 `state` 设为 `done` 并提交。

## 目录约定

| 路径 | 用途 |
|------|------|
| `collaboration/HANDOFF.md` | 给 Cursor 的当前指令（单任务） |
| `collaboration/STATUS.md` | 状态机与阻塞说明 |
| `collaboration/CURRENT_TASK.md` | 背景与 DoD（OpenClaw 维护） |
| `collaboration/decisions-needed/` | 需人类 / OpenClaw 拍板的问题 |
| `collaboration/cursor-out/` | Cursor 侧结构化产出（可选） |
| `collaboration/retrospectives/` | 复盘记录 |
