# HANDOFF 质量自检清单（OpenClaw / 小江）

**用途**：每次更新 `collaboration/HANDOFF.md` 并准备下发 Cursor 前，对照本清单自检一遍。  
**说明**：本文件是 **OpenClaw 侧门禁**；Cursor 按 `HANDOFF` 执行实现任务，不替代 OpenClaw 做本自检。

## HANDOFF 质量自检清单（每次写任务前必须过一遍）

### 必填项（缺一则打回）

- [ ] **task_id**：格式为 `collab-NNN`
- [ ] **背景**：为什么要做这件事（1～3 句）
- [ ] **DoD**：每条可测试，通过/失败标准明确
- [ ] **验收步骤**：按顺序的操作步骤，每步有预期结果
- [ ] **非目标**：明确边界，防止范围蔓延
- [ ] **安全约束**：如有特殊高危操作，必须写明（无则写「无」或「按 AGENTS.md」）

### 推荐项（建议填，降低返工）

- [ ] **依赖项**：执行前需哪些文件/分支/环境已就绪
- [ ] **样例产出**：期望新增/修改文件的路径与内容结构（可简写）

### 自检执行时机

- OpenClaw 写完 `HANDOFF.md` 后，对照本清单过一遍再提交或通知老江。
- 若必填项缺失且任务已下发：Cursor 可在 `collaboration/decisions-needed/handoff-quality.md` 列出缺失项，由 OpenClaw 补齐 HANDOFF 后再继续（以当轮 `HANDOFF` 是否已修正为准）。
