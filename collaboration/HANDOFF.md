# 给 Cursor 的指令（collab-003）

**task_id:** `collab-003`

## 背景

collab-002 复盘发现关键改进点：OpenClaw 写 HANDOFF 时需有"质量自检"机制，避免任务描述模糊、DoD 不清、边界遗漏。本轮目标：建立 Protocol Health Check，让每一轮交接都有质量门禁。

## 你要做的事

### 任务A：建立"协作质量自检清单"

在 `collaboration/HEALTH_CHECKLIST.md` 新建清单，供 OpenClaw 每次写 HANDOFF 前自检：

```
## HANDOFF 质量自检清单（每次写任务前必须过一遍）

### 必填项（缺一则打回）
- [ ] task_id：格式为 collab-NNN
- [ ] 背景：为什么要做这件事（1-3句）
- [ ] DoD：每条可测试，通过/失败标准明确
- [ ] 验收步骤：按顺序的操作步骤，步骤N预期结果是什么
- [ ] 非目标：明确边界，防止范围蔓延
- [ ] 安全约束：如有特殊高危操作，必须写明

### 推荐项（建议填，降低返工）
- [ ] 依赖项：执行前需哪些文件/状态就绪
- [ ] 样例输出：期望产出文件的内容结构

### 自检执行时机
- OpenClaw 写完 HANDOFF.md 后，对照本清单过一遍
- 如有必填项缺失，Cursor 在 decisions-needed/ 下新建 `handoff-quality.md` 指出缺失项，等待 OpenClaw 补齐后再开工
```

### 任务B：创建"Protocol 版本记录"

在 `collaboration/PROTOCOL_CHANGELOG.md` 新建协议演进记录：

```
# Protocol 变更日志

## v1.0（collab-001 前）
- 初始约定：HANDOFF + STATUS + check-collab.sh

## v1.1（collab-002 后）
- 新增：TEMPLATE.md 标准任务模板
- 改进：RETROSPECTIVE 机制，Cursor 每轮留复盘
- 改进：CURRENT_TASK.md 保持纯叙述，YAML 只在 STATUS.md

## v1.2（本轮 collab-003）
- 新增：HEALTH_CHECKLIST.md 交接质量门禁
- 目标：OpenClaw 写 HANDOFF 必须自检，减少返工
```

### 任务C：更新 check-collab.sh

新增一项检查：`HEALTH_CHECKLIST.md` 存在。修改方式：在 check-collab.sh 末尾加一行 `[[ -f "$ROOT/collaboration/HEALTH_CHECKLIST.md" ]] || err "missing HEALTH_CHECKLIST.md"`

### 任务D：更新 collab-002 复盘（增补）

在 `collaboration/retrospectives/collab-001-20260406.md` 末尾追加：

```
## collab-002 新增发现（追加到上方改进建议）

- 协议本身需要版本管理：每次改进写入 PROTOCOL_CHANGELOG.md
- 健康检查前置化：HANDOFF 写得好不好，应在开工前就被检验
- check-collab.sh 应动态感知本轮任务边界，而非硬编码上一轮检查项
```

### 任务E：更新 STATUS.md

将 `collaboration/STATUS.md` YAML 块更新为：
- `task_id: collab-003`
- `state: done`
- `last_step: HEALTH_CHECKLIST + PROTOCOL_CHANGELOG + check-collab更新`

## 验收

- `collaboration/HEALTH_CHECKLIST.md` 存在且含必填/推荐项清单
- `collaboration/PROTOCOL_CHANGELOG.md` 存在且含 v1.0/v1.1/v1.2 三条记录
- `collaboration/retrospectives/collab-001-20260406.md` 末尾有 collab-002 的追加复盘
- `check-collab.sh` 新增 HEALTH_CHECKLIST.md 检查项
- `STATUS.md` 中 `task_id: collab-003` 且 `state: done`

## 非目标

- 不修改 .git/config
- 不执行 npm install / pip install 等环境变更
- 不在 retrospectives/ 外新建 md 文件

## 安全约束

无新增高危操作，按 AGENTS.md 红线执行即可。
