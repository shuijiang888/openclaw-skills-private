# PostgreSQL 数据库结构（营销诊断系统）

> 与 `backend_api_design.md`、`deployment_guide.md` 一致；迁移可用 **Flyway** 或 **Prisma Migrate**。  
> 说明：ER 中「Lead」在实现上将 **联系信息** 落在 `submissions` + `bookings`；另增 **`crm_sync_log`** 满足「5 张核心业务表 + 同步审计」验收。

---

## 1. ER 关系（文字）

```
Campaign（营销活动）
  1 : N
Submission（问卷提交）
  1 : 1   Report（诊断报告 PDF 元数据）
  1 : N   Booking（预约记录，可选多条历史）
  1 : N   CrmSyncLog（CRM 推送审计 / 重试）
```

---

## 2. DDL（PostgreSQL 14+）

```sql
-- 营销活动表
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  utm_source VARCHAR(50),
  q_version VARCHAR(20) NOT NULL DEFAULT '1.0',
  booking_url VARCHAR(500),
  hotline VARCHAR(50),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 问卷提交表（核心）
CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE RESTRICT,

  company_name VARCHAR(255) NOT NULL,
  industry VARCHAR(100),
  scale VARCHAR(50),
  years VARCHAR(20),

  contact_name VARCHAR(100),
  contact_phone VARCHAR(20),
  contact_company VARCHAR(255),
  open_question TEXT,

  answers_json JSONB NOT NULL,

  score_total NUMERIC(5,2),
  score_level VARCHAR(20),
  score_d1 NUMERIC(5,2),
  score_d2 NUMERIC(5,2),
  score_d3 NUMERIC(5,2),
  score_d4 NUMERIC(5,2),
  score_d5 NUMERIC(5,2),
  score_d6 NUMERIC(5,2),

  utm_sales VARCHAR(50),
  utm_medium VARCHAR(100),

  crm_lead_id VARCHAR(64),
  crm_lead_status VARCHAR(20) NOT NULL DEFAULT 'pending',

  device_fingerprint VARCHAR(100),
  duration_seconds INTEGER,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_level CHECK (
    score_level IS NULL OR score_level IN ('卓越','良好','一般','薄弱','危机')
  ),
  CONSTRAINT valid_crm_status CHECK (
    crm_lead_status IN ('pending','created','updated','failed')
  )
);

-- 报告表
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL UNIQUE REFERENCES submissions(id) ON DELETE CASCADE,

  pdf_path VARCHAR(500),
  share_url VARCHAR(500),
  expires_at TIMESTAMPTZ,

  status VARCHAR(20) NOT NULL DEFAULT 'pending',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_report_status CHECK (
    status IN ('pending','generating','ready','failed')
  )
);

-- 预约表
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,

  contact_name VARCHAR(100),
  contact_phone VARCHAR(20),
  preferred_time VARCHAR(100),
  note TEXT,

  status VARCHAR(20) NOT NULL DEFAULT 'pending',

  crm_task_id VARCHAR(64),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_booking_status CHECK (
    status IN ('pending','confirmed','completed','cancelled')
  )
);

-- CRM 同步日志（幂等、排错、第五张表）
CREATE TABLE crm_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  idempotency_key VARCHAR(128),
  request_payload JSONB,
  response_payload JSONB,
  http_status INTEGER,
  status VARCHAR(20) NOT NULL DEFAULT 'success',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_sync_status CHECK (
    status IN ('success','failed','retrying')
  )
);

-- 索引
CREATE INDEX idx_submissions_campaign ON submissions(campaign_id);
CREATE INDEX idx_submissions_crm_status ON submissions(crm_lead_status);
CREATE INDEX idx_submissions_utm_sales ON submissions(utm_sales);
CREATE INDEX idx_submissions_submitted_at ON submissions(submitted_at DESC);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_bookings_submission ON bookings(submission_id);
CREATE INDEX idx_crm_sync_submission ON crm_sync_log(submission_id);
CREATE UNIQUE INDEX idx_crm_sync_idempotency ON crm_sync_log(idempotency_key)
  WHERE idempotency_key IS NOT NULL;
```

---

## 3. 迁移脚本命名规范

| 文件 | 说明 |
|------|------|
| `V001__init_schema.sql` | 上表 + 索引 |
| `V002__add_crm_fields.sql` | 后续新增列（如 `top3_json`、`ip_country`） |
| `V003__...` | 按需递增 |

Prisma 用户可使用 `prisma migrate dev --name init_schema` 生成等价迁移。

---

## 4. 与评分引擎

- `answers_json` 存 H5 原始结构（题号、选项 key、文本）；**服务端 `scoring.ts`** 与 H5 `computeScores` 逻辑 **必须单测对齐**（Golden cases）。  
- `score_*` 在事务内写入 submission，再入队 `GenerateReportJob` / `SyncCrmJob`。

---

## 5. 保留策略（建议）

- `reports.pdf_path` 文件对象生命周期 90 天 + COS 生命周期策略；DB 中 `expires_at` 与之一致。  
- `crm_sync_log` 可分区或定期归档（>90 天）。
