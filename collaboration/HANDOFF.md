# 给 Cursor 的指令（collab-002）

**task_id:** `collab-002`

## 背景

collab-001 已验证了"写 HANDOFF → Cursor 执行 → STATUS 回传 → 脚本验收"闭环。本轮目标：固化这个流程，建立可复用的任务模板资产，让后续每一轮handoff成本趋近于零。

## 你要做的事

### 任务A：写 collab-001 复盘

在 `collaboration/retrospectives/collab-001-20260406.md` 新建复盘文档，包含：

1. **过程回顾**：collab-001 从 in_progress 到 done 的关键步骤
2. **遇到的问题**：check-collab.sh 失败时的处理方式
3. **协议有效性**：哪些设计点实际跑了，哪些需要调整
4. **改进建议**：下一个任务需要改什么

格式：Markdown，用标题+列表，简洁务实。

### 任务B：建立标准任务模板

在 `collaboration/TEMPLATE.md` 新建可复用任务模板，供后续 collab-003+ 使用：

```
# TASK.md 模板
## 任务ID
task_id: collab-XXX

## 背景（为什么做这件事）

## 完成定义（DoD）
- 可测试的3-5条
- 每条有明确"通过/失败"标准

## 验收步骤
1. 具体操作步骤
2. 预期结果

## 非目标（明确边界）

## 安全约束（如果有特殊限制）
```

### 任务C：更新 check-collab.sh（可选）

如果 `TEMPLATE.md` 新增了必要检查项，在 `check-collab.sh` 里加上。否则跳过此任务。

### 任务D：更新 STATUS.md

将 `collaboration/STATUS.md` 的 YAML 块更新为：
- `task_id: collab-002`
- `state: done`
- `last_step: 简述本轮完成内容`

## 验收

- `collaboration/retrospectives/collab-001-20260406.md` 存在且内容完整
- `collaboration/TEMPLATE.md` 存在且包含 DoD/验收步骤/非目标 三节
- `./scripts/check-collab.sh` 退出码 0（或新增检查通过）
- `STATUS.md` 中 `task_id: collab-002` 且 `state: done`

## 非目标

- 不改 .git/config
- 不创建新目录（retrospectives/ 已存在）
- 不执行 npm install / pip install 等环境变更命令
