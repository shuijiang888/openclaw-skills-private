# 当前任务（OpenClaw 维护）

## 任务 ID

`collab-001`

## 背景

建立可重复的 OpenClaw → Cursor 交接闭环，用一个小改动验证「写 HANDOFF → Cursor 执行 → STATUS 回传 → 脚本验收」全流程。

## 完成定义（DoD）

- `collaboration/playbook.md` 存在且包含规定的六个章节标题。
- `./scripts/check-collab.sh` 成功。
- `collaboration/STATUS.md` 中 `task_id` 为 `collab-001` 且 `state: done`。

## 非目标

- 不接真实业务需求；不引入重型框架。
