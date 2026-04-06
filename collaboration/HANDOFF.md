# 给 Cursor 的指令（单次任务）

**task_id:** `collab-001`

## 你要做的事

1. 新建 `collaboration/playbook.md`，必须包含以下 **一级标题**（Markdown `#`），顺序一致：
   - `# 目标对齐`
   - `# 指令下发`
   - `# Cursor 执行`
   - `# 过程管理`
   - `# 质量与发布`
   - `# 复盘`
2. 每个章节下用 2～4 条要点（列表即可），描述本仓库中 OpenClaw 与 Cursor 的职责边界（可结合 `README.md`）。
3. 将 `collaboration/STATUS.md` 更新为：`state: review`，并填写 `last_step` 说明你已完成文档与待验收。
4. 运行 `./scripts/check-collab.sh`；若失败则修复至通过，然后把 `state` 改为 `done`。

## 验收

- `./scripts/check-collab.sh` 退出码 0
- `STATUS.md` 内 `task_id: collab-001` 且 `state: done`
