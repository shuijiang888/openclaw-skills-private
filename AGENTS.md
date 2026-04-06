# Cursor Agent 约定（本仓库）

1. **开工前**阅读 `collaboration/HANDOFF.md`、`collaboration/STATUS.md`、`collaboration/CURRENT_TASK.md`（若存在）。
2. **只通过文件协作**：进度写入 `collaboration/STATUS.md`；不确定项写入 `collaboration/decisions-needed/<主题>.md`，不要假设 OpenClaw 能「看到」聊天内容。
3. **完成定义**：`./scripts/check-collab.sh` 退出码为 0，且 `STATUS.md` 中 `state: done` 与本次 `task_id` 一致。
4. **禁止**：在未更新 `STATUS.md` 的情况下大范围改约定目录结构；不要提交密钥或令牌。
