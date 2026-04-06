# Agent 约定（本仓库）

## 协作路径（OpenClaw → Cursor）

1. **OpenClaw 写任务**：仅在本仓库维护 `collaboration/CURRENT_TASK.md` 与 `collaboration/HANDOFF.md`（背景、DoD、可执行步骤以二者为准）。
2. **Cursor 读文件执行**：开工即读上述两文件，**按文件执行**；用户聊天只做澄清，**不得替代** `HANDOFF` / `CURRENT_TASK` 中的任务定义。
3. **过程与结论**：进度与阻塞写入 `collaboration/STATUS.md`；待决策写入 `collaboration/decisions-needed/`。

## 角色分工

- **Cursor**：本地代码与文档执行者；以任务文件为唯一依据，执行后更新 `STATUS.md`。
- **OpenClaw**：任务下发与验收；在本仓库写 `CURRENT_TASK.md`、`HANDOFF.md`。
- **小江**：流程与安全守门（与本仓库约定一致）。

## 开工前必读

1. 阅读 `collaboration/HANDOFF.md`、`collaboration/CURRENT_TASK.md`、`collaboration/STATUS.md`。
2. 只通过文件协作：进度写入 `STATUS.md`；不确定项写入 `decisions-needed/<主题>.md`。
3. 完成定义：以 `HANDOFF` / `CURRENT_TASK` 中的验收为准；本仓库默认 `./scripts/check-collab.sh` 退出码为 0，且 `STATUS.md` 中 YAML `state: done` 与当前 `task_id` 一致。

## 安全红线（违反即阻断）

遇下列任一情形，**立即停止执行**（不继续改代码、不跑高危命令），在 `STATUS.md` 的 `blocker` 说明原因，必要时在 `decisions-needed/` 留档，等待老江或小江确认后再继续。

- **禁止**修改 `.git/` 目录结构、**禁止** `git push --force`、**禁止**擅自改 `.git/config`。
- **禁止**执行 `rm -rf`、`chmod -R 777` 等明显高危命令；**禁止**提交密钥、令牌或凭据。
- **高危操作**（删库、批量改权限、改生产配置等）须先在 `decisions-needed/` 写明方案与回滚，**未确认前不得执行**。

## OpenClaw 在本仓库的操作边界（供小江对齐）

- 常规可写：`collaboration/`、`scripts/`（与任务相关时）、`collaboration/cursor-out/`、`collaboration/decisions-needed/`。
- 删除路径或改 `scripts/` 验收逻辑前须可追踪（建议先经老江确认）。
- 高危命令执行前先报老江。
