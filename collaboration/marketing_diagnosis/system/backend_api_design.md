# 后端 API 设计（营销诊断服务）

> 部署后与 Nginx `location /diag/` → `http://127.0.0.1:3090/` 拼接，对外路径形如：`http://119.45.205.137/diag/api/v1/...`（以 `proxy_pass` 是否去前缀为准，**实现时统一一种**）。  
> **非目标**：本文档不含可运行代码，仅接口与模块边界。

---

## 1. 技术选型

| 层级 | 选型 | 说明 |
|------|------|------|
| 运行时 | Node.js 18+ | 与现有 profit-web 对齐 |
| HTTP | Fastify | 轻量、schema 校验友好 |
| ORM | Prisma | 与现有 prisma 习惯一致 |
| 数据库 | PostgreSQL | 腾讯云 RDS 或自建 |
| 队列 | Redis + Bull | PDF 生成、CRM 同步、通知 |
| 公开接口 | 无 JWT | 问卷端；**限流 + 可选验证码** |
| 管理端 | JWT（Bearer） | `/api/v1/admin/*` |

---

## 2. REST 接口

### 2.1 健康检查

```
GET /api/v1/health
Response 200: { "ok": true, "version": "1.0.0" }
```

### 2.2 问卷提交（H5）

```
POST /api/v1/submissions
Content-Type: application/json
```

**Request（与 H5 改造对齐）**

```json
{
  "campaign_id": "uuid",
  "company_name": "深圳市XX科技有限公司",
  "industry": "制造业",
  "scale": "50-200人",
  "years": "3-10年",
  "contact_name": "李总",
  "contact_phone": "13800138000",
  "contact_company": "深圳市XX科技有限公司",
  "open_question": "想提升渠道数字化",
  "answers": { "q1": 5, "q2": ["p1","p2"], "multi": {} },
  "utm_sales": "SHUIJIANG",
  "utm_medium": "wechat",
  "duration_seconds": 420,
  "device_fingerprint": "optional-hash"
}
```

> `answers` 结构可与当前 H5 `state` 序列化一致；服务端用 Zod/JSON Schema 校验。

**Response `202 Accepted`**

```json
{
  "submission_id": "uuid",
  "message": "提交成功，报告生成中",
  "report_url": null
}
```

### 2.3 报告状态查询

```
GET /api/v1/submissions/:id/report
```

**Response**

```json
{
  "status": "pending|generating|ready|failed",
  "pdf_url": "https://119.45.205.137/diag/uploads/reports/xxx.pdf",
  "expires_at": "2026-07-01T00:00:00.000Z"
}
```

### 2.4 预约提交

```
POST /api/v1/bookings
Content-Type: application/json
```

```json
{
  "submission_id": "uuid",
  "contact_name": "李总",
  "contact_phone": "13800138000",
  "preferred_time": "工作日上午10点",
  "note": "想聊渠道数字化"
}
```

**Response `201`**

```json
{ "booking_id": "uuid", "status": "pending" }
```

### 2.5 管理端：分页列表

```
GET /api/v1/admin/submissions?page=1&limit=20&level=薄弱&campaign_id=&utm_sales=
Authorization: Bearer <jwt>
```

### 2.6 管理端：手动触发 CRM 同步

```
POST /api/v1/admin/submissions/:id/sync-crm
Authorization: Bearer <jwt>
```

**Response**

```json
{ "queued": true, "job_id": "bull-job-id" }
```

### 2.7 活动配置（可选，供 H5 拉取 CONFIG）

```
GET /api/v1/campaigns/:id/public-config
```

返回 `booking_url`、`hotline`、`report_title` 等（仅公开非敏感字段）。

---

## 3. 异步任务（Bull）

| Job | 队列名 | 输入 | 行为 |
|-----|--------|------|------|
| **GenerateReportJob** | `report` | `submission_id` | 读模板 + 数据 → Puppeteer/wkhtmltopdf → 写 `uploads/reports/` → 更新 `reports` |
| **SyncCrmJob** | `crm` | `submission_id` | 调纷享 OpenAPI → 写 `crm_lead_id` → 写 `crm_sync_log` |
| **SendNotificationJob** | `notify` | `submission_id`, `channel` | 短信/邮件/企微模板（Phase 2） |

**并发建议**：`report` 2～4；`crm` 1～2（视纷享限频）。

**重试**：Bull `attempts: 5`, `backoff: exponential`。

---

## 4. 目录结构（建议）

```
/opt/marketing-diag/
├── api/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── submissions.ts
│   │   │   ├── reports.ts
│   │   │   ├── bookings.ts
│   │   │   ├── campaigns.ts
│   │   │   └── admin.ts
│   │   ├── services/
│   │   │   ├── scoring.ts
│   │   │   ├── report.ts
│   │   │   ├── crm.ts
│   │   │   └── notification.ts
│   │   ├── jobs/
│   │   │   ├── report.ts
│   │   │   ├── crm.ts
│   │   │   └── notify.ts
│   │   ├── plugins/
│   │   │   └── rateLimit.ts
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
├── prisma/
│   └── schema.prisma
├── uploads/
│   └── reports/
├── nginx/
│   └── diag.conf
└── pm2.config.js
```

---

## 5. H5 改造要点（与 collab-008 衔接）

1. 提交时 `fetch('/diag/api/v1/submissions', { method:'POST', body })`（路径随 Nginx 最终规则调整）。  
2. 轮询 `GET .../submissions/:id/report` 直至 `ready` 或超时展示人工客服入口。  
3. `utm_sales`、`campaign_id` 从 `URLSearchParams` 读取并随提交带上。  
4. 本地 `computeScores` 可保留作 **即时预览**；**最终以服务端分数为准**（避免篡改）。

---

## 6. 安全

- 全局限流（IP + `device_fingerprint`）。  
- `POST /submissions` 可选 **腾讯云验证码** / Turnstile。  
- Admin JWT 短期有效 + 刷新策略。  
- 文件下载 URL 使用 **签名 URL** 或 token query（短期）。
