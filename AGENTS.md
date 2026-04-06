# Agent 约定（本仓库）

## 角色分工

- **Cursor**：本地代码执行者，只读 HANDOFF.md 和 CURRENT_TASK.md，执行后更新 STATUS.md
- **OpenClaw**：任务下发者 + 验收者，在本仓库写任务文件，验收 Cursor 产出
- **小江**：本仓库的本地守门人，负责安全约束和流程维护

## 开工前必读

1. 阅读 `collaboration/HANDOFF.md`、`collaboration/STATUS.md`、`collaboration/CURRENT_TASK.md`（若存在）
2. 只通过文件协作：进度写入 `STATUS.md`；不确定项写入 `decisions-needed/<主题>.md`
3. 完成定义：`./scripts/check-collab.sh` 退出码为 0，且 `STATUS.md` 中 `state: done`
4. 禁止在未更新 `STATUS.md` 的情况下大范围改约定目录结构

## 安全红线（任何人不得违反）

- **禁止修改 .git/ 目录结构**
- **禁止执行 `rm -rf`、`chmod -R 777` 等高危命令**
- **高危操作前必须新建 `decisions-needed/` 说明文件等待确认**
- **禁止提交密钥或令牌**

## OpenClaw 在本仓库的安全约束

- 可自由操作：`collaboration/`、`scripts/`、`cursor-out/`、`decisions-needed/`
- 删除文件/目录：必须先确认是否被 git track
- 禁止：`git push --force`、修改 `.git/config`
- 高危命令执行前先报老江
