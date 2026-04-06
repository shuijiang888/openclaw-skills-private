# 纷享 CRM 线索跟进流程（营销诊断）

> 衔接：`user_flow.md`（客户侧）+ `openapi_integration.md`（接口）+ `backend_api_design.md`（任务）。  
> 角色：客户、销售、运营、顾问。

---

## 1. 端到端标准流程（5 步）

### 步骤 1：客户提交问卷

1. 销售分享带 UTM 的链接或二维码（见第 2 节）。  
2. 客户打开 H5（`/diag/`），完成 QB1–QB4 + Q1–Q26。  
3. H5 `POST /api/v1/submissions` → 服务端校验 → 写 `submissions` + `reports(pending)`。  
4. 服务端 **同步** 计算分数（与 `scoring_model.md` 一致）并更新 `submissions.score_*`。  
5. 入队 **GenerateReportJob**、**SyncCrmJob**（及可选 **SendNotificationJob**）。  
6. 返回 **202** + `submission_id`；H5 轮询报告状态。

### 步骤 2：销售收到通知

1. **纷享** 出现新线索（或进入公海池）。  
2. 线索上字段：`lead_source=营销诊断问卷`、`diagnosis_score`、`diagnosis_level`、`diagnosis_top3`、六维分。  
3. 若已配置 **负责人映射**：`utm_sales` → 查询用户 API → 自动设 `owner_id`。  
4. 可选：企业微信/邮件通知负责人「新诊断线索」。

### 步骤 3：销售查看报告

1. 登录 **内部管理后台** `GET /api/v1/admin/submissions/:id`（需实现详情接口，设计可沿用列表扩展）。  
2. 查看原始答案、分数、TOP3；下载 **PDF**（`reports.pdf_path` 或签名 URL）。  
3. 外呼前阅读 `open_question`（Q26）与 QB 基础信息。

### 步骤 4：预约确认

1. 客户在报告页点击 **预约** → `POST /api/v1/bookings`。  
2. 写 `bookings` 表；可选 **SyncCrmJob** 更新线索阶段或创建 **CRM 任务**（`crm_task_id`）。  
3. 销售在日历/任务中确认时段，咨询后更新线索状态（在纷享内操作）。

### 步骤 5：商机转化

1. **高分线索**（如总分 ≥70，阈值可配置）在周内由销售 **转商机**。  
2. 走标准销售流程：需求确认 → 方案 → 报价 → 赢单/输单。  
3. 流失原因回填 CRM，供后续优化问卷与话术。

---

## 2. UTM 追踪机制

### 2.1 链接格式

```
https://your-domain.com/diag/?campaign=<campaign_uuid>&utm_sales=<工号>&utm_medium=wechat
```

| 参数 | 含义 |
|------|------|
| `campaign` | 对应 `campaigns.id`，决定 `booking_url`/`hotline` 等 |
| `utm_sales` | 销售工号，写入 `submissions.utm_sales`，同步 CRM |
| `utm_medium` | 渠道标记（企微/邮件/展会） |

### 2.2 H5 行为

- 页面 `load` 时解析 Query，存入 `sessionStorage`，提交时一并发送。  
- 缺失 `utm_sales` 时：允许提交但标记 `owner=未分配`，由运营在后台补派。

### 2.3 月底统计

- 按 `utm_sales` + `score_level` + `bookings.status` 聚合；SQL 或 BI 导出。

---

## 3. 管理后台功能（内部）

### 3.1 Phase 1（必做）

- 提交列表：筛选 **活动 / 销售 / 等级 / 日期 / CRM 状态**  
- 详情：答案 JSON、分数、报告链接、同步日志 `crm_sync_log`  
- 按钮：**手动同步 CRM**（重试失败任务）

### 3.2 Phase 2（可选）

- 导出 Excel（脱敏）  
- 批量重推 CRM / 批量分配  
- 看板：提交量、完成率、报告 ready 耗时 P95、预约率、线索创建成功率

---

## 4. 异常场景

| 场景 | 处理 |
|------|------|
| PDF 生成失败 | `reports.status=failed`，通知运维；客户页展示客服热线 |
| CRM 限频 | Bull 降并发 + 退避；`crm_lead_status=failed` |
| 重复提交 | 同 `device_fingerprint` + 手机号短窗合并策略（产品定） |
| 客户改约 | 多条 `bookings` 或更新最新一条 `pending` |

---

## 5. 与 Agent 分工建议

- **Agent1**：API + Prisma + Bull + Nginx/PM2 部署脚本  
- **Agent2**：H5 对接提交/轮询 + 纷享字段落地 + 管理端页面（或低代码）  
- **小江**：验收字段映射、UTM 规则、门禁清单
