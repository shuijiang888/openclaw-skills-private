# 通用行业营销诊断 — 需求交接包（给小江 / Agent1，v1.3）

## 1. 交接目的

本目录用于统一讨论「独立系统 + 腾讯云部署 + 二期 CRM 对接」方案，避免口头同步造成偏差。

---

## 2. 必读文档（按顺序）

1. 架构草案（边界、拓扑、发布/回滚、待拍板）
   - `collaboration/marketing_diagnosis/universal/ARCHITECTURE_DRAFT_v1.md`
2. 数据库草案（MVP 表结构）
   - `collaboration/marketing_diagnosis/universal/MVP_SCHEMA_DRAFT.sql`
3. API 示例（请求/响应样例）
   - `collaboration/marketing_diagnosis/universal/API_PAYLOAD_EXAMPLES_v1.md`

> 优先级规则：
> - 若 Agent1 分支（PR #4）已合并，请以主线文档为准。
> - 本目录文档用于讨论包和联调底稿，对主线仅做补充，不覆盖已确认版本。
> - 当前对齐基线分支：`cursor/agent-2fd9`；示例提交：`0772166`（此前对齐点见 `324d179`）。

---

## 3. 当前已落地事实（用于和方案对齐）

### 3.1 门户入口

当前门户三张营销诊断卡片已指向：

- `/diag/h5_medical.html`
- `/diag/h5_energy.html`
- `/diag/h5_manufacturing.html`

### 3.2 三个 H5 页面

已具备：

- 轻诊断 10 步 -> 初估 -> 解锁完整版续答
- Q_B2 多选展示
- localStorage 断点续答
- 专家预约二次确认
- PDF 导出（依赖 cdnjs）

---

## 4. 第一阶段实施范围（建议拍板）

1. 保持 H5 静态部署不变（先稳住前台）
2. 新增独立诊断 API 服务（落库、查阅、统计、线索）
3. 新增独立诊断数据库（不要耦合现有盈利系统业务表）
4. 前端提交改为「本地体验 + 服务端落库」

---

## 5. 第二阶段（纷享销客）

1. 仅服务端对接
2. 密钥不进前端
3. 异步重试，不阻塞用户提交

---

## 6. 会议待决项（建议会议模板）

1. 数据库选型：MySQL / PostgreSQL
2. API 部署形态：独立域名或现有网关转发
3. 版本治理：`industryEdition + questionnaireVersion + scoringModelVersion` 强制策略
4. CRM 映射：线索与商机最小字段
5. 验收口径：成功率、响应时间、回滚窗口

---

## 7. 相关现有文档

- `collaboration/marketing_diagnosis/system/deployment_guide.md`
- `collaboration/marketing_diagnosis/system/backend_api_design.md`

---

## 8. 与 Agent1 方案的对齐点（本包显式约束）

1. 保持四表主结构：`diag_submission` / `diag_lead` / `diag_sync_job` / `diag_daily_stat`
2. `diag_lead` 通过 `lead_kind` 区分两类语义：
   - `diagnosis_summary`（报告同步线索）
   - `expert_opportunity`（联系专家商机）
3. 允许 H5 请求「type + payload」原样透传并入库（`payload_json`），降低前端改造成本
4. 二期纷享对接坚持：仅服务端、异步重试、不阻塞用户主提交流程

