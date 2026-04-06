# 给 Cursor 的指令（collab-009）

**task_id:** `collab-009`

## 背景

collab-008 已完成企业级问卷H5（95/100）。本轮目标：设计完整的"企业营销诊断系统"实现方案，让 Agent1/2 可照此文档直接开发、部署、对接纷享CRM。

**最终部署位置：** 腾讯云 `119.45.205.137`，Nginx路由 `/diag/*`，入口嵌入门户首页卡片。

**用户旅程（必须先理解）：**
```
销售发二维码 → 客户填问卷 → 提交 → 后端评分+生成报告 → 客户收到报告 → 预约CTA → 纷享CRM创建线索 → 销售跟进
```

---

## 完成定义（DoD）

- [ ] `marketing_diagnosis/system/openapi_integration.md` — 纷享CRM OpenAPI对接方案
- [ ] `marketing_diagnosis/system/database_schema.md` — PostgreSQL数据库表结构
- [ ] `marketing_diagnosis/system/backend_api_design.md` — 后端API接口设计
- [ ] `marketing_diagnosis/system/deployment_guide.md` — 腾讯云部署指南
- [ ] `marketing_diagnosis/system/crm_workflow.md` — CRM线索创建后的跟进流程
- [ ] `./scripts/check-collab.sh` 更新绑定 collab-009
- [ ] `STATUS.md`：`task_id: collab-009`，`state: done`

---

## 参考文件（必须先读）

- `collaboration/marketing_diagnosis/mvp/h5_questionnaire.html` — 现有H5（API提交部分需要改造）
- `collaboration/marketing_diagnosis/system_design.md` — Phase 1设计（已有架构草图）
- `collaboration/marketing_diagnosis/scoring_model.md` — 评分模型（需在后端重新实现）
- `collaboration/marketing_diagnosis/report_template.md` — 报告模板

---

## 验收步骤

### Step 1：设计纷享CRM OpenAPI对接方案（openapi_integration.md）

**必须包含：**

#### 1.1 纷享CRM OpenAPI基础信息
```markdown
## 纷享CRM OpenAPI 对接方案

### API基础
- 文档地址：https://open.fxiaoke.com/ （待确认）
- 认证方式：AppId + AppSecret → AccessToken
- Token刷新机制：有效期2小时，需自动刷新

### 核心接口（需要老江提供真实API地址和AppId/AppSecret）
| 接口 | 方法 | 用途 |
|------|------|------|
| 创建线索 | POST /crm/v2/leads | 问卷提交后创建CRM线索 |
| 更新线索 | PUT /crm/v2/leads/{id} | 补充分数/等级/预约状态 |
| 创建商机 | POST /crm/v2/opportunities | 高分线索转商机 |
| 查询用户 | GET /crm/v2/users | 销售工号→用户ID映射 |
```

#### 1.2 字段映射（问卷→CRM）
```markdown
## 问卷字段 → 纷享CRM字段 映射

| 问卷字段 | CRM字段 | 说明 |
|----------|---------|------|
| 公司名称 | company_name | 必填 |
| 行业 | industry | 下拉选项 |
| 规模 | employee_size | 下拉选项 |
| 联系人姓名 | name | 必填 |
| 手机 | mobile | 必填 |
| 综合得分 | diagnosis_score | 自定义字段(Number) |
| 等级 | diagnosis_level | 自定义字段(单选) |
| TOP3问题 | diagnosis_top3 | 自定义字段(多行文本) |
| 来源 | lead_source | 固定值：营销诊断问卷 |
| utm_sales | owner_id | 销售工号→CRM用户ID |
```

#### 1.3 线索创建Request示例
```json
{
  "lead": {
    "name": "李总",
    "mobile": "13800138000",
    "company_name": "深圳市XX科技有限公司",
    "industry": "IT/互联网",
    "employee_size": "100-500人",
    "diagnosis_score": 72,
    "diagnosis_level": "良好",
    "diagnosis_top3": "1. 获客渠道单一\n2. 销售管道标准化不足\n3. CRM数据质量一般",
    "lead_source": "营销诊断问卷",
    "utm_sales": "SHUIJIANG",
    "custom_fields": [
      { "field_name": "diagnosis_dim1", "value": 15 },
      { "field_name": "diagnosis_dim2", "value": 14 }
    ]
  }
}
```

#### 1.4 待确认事项（必须标注）
```markdown
## ⚠️ 待老江提供（部署前必须确认）

1. 纷享CRM的AppId和AppSecret（联系纷享技术支持获取）
2. OpenAPI的真是HTTPS地址
3. 自定义字段API（diagnosis_score等）是否支持批量创建
4. 线索创建后是否自动分配销售（还是手动分配）
```

---

### Step 2：设计数据库Schema（database_schema.md）

**必须包含：**

#### 2.1 ER图（文字描述）
```
Campaign（营销活动）
  1:N
Submission（问卷提交）
  1:1
Report（诊断报告）
  1:1
Lead（客户联系信息）
  N:1
Submission
```

#### 2.2 表结构（PostgreSQL）

```sql
-- 营销活动表
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,           -- 活动名称，如"2026Q2营销诊断"
  utm_source VARCHAR(50),                -- 来源渠道
  q_version VARCHAR(20),                -- 问卷版本
  booking_url VARCHAR(500),            -- 预约链接
  hotline VARCHAR(50),                  -- 热线电话
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 问卷提交表（核心）
CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id),
  
  -- 基础信息
  company_name VARCHAR(255) NOT NULL,
  industry VARCHAR(100),
  scale VARCHAR(50),
  years VARCHAR(20),
  
  -- 联系信息
  contact_name VARCHAR(100),
  contact_phone VARCHAR(20),
  contact_company VARCHAR(255),
  open_question TEXT,
  
  -- 原始答案（JSON）
  answers_json JSONB NOT NULL,
  
  -- 评分结果
  score_total DECIMAL(5,2),
  score_level VARCHAR(20),             -- 卓越/良好/一般/薄弱/危机
  score_d1 DECIMAL(5,2),
  score_d2 DECIMAL(5,2),
  score_d3 DECIMAL(5,2),
  score_d4 DECIMAL(5,2),
  score_d5 DECIMAL(5,2),
  score_d6 DECIMAL(5,2),
  
  -- UTM追踪
  utm_sales VARCHAR(50),              -- 销售工号
  utm_medium VARCHAR(100),             -- 渠道
  
  -- CRM关联
  crm_lead_id VARCHAR(50),            -- 纷享CRM线索ID
  crm_lead_status VARCHAR(20),        -- pending/created/updated
  
  -- 元数据
  device_fingerprint VARCHAR(100),
  duration_seconds INTEGER,
  submitted_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT valid_level CHECK (score_level IN ('卓越','良好','一般','薄弱','危机'))
);

-- 报告表
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID UNIQUE REFERENCES submissions(id),
  
  -- 报告文件
  pdf_path VARCHAR(500),                -- /uploads/reports/{id}.pdf
  share_url VARCHAR(500),              -- 外链URL
  expires_at TIMESTAMP,                -- 链接过期时间
  
  -- 报告状态
  status VARCHAR(20) DEFAULT 'pending',  -- pending/generating/ready/failed
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 预约表
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES submissions(id),
  
  contact_name VARCHAR(100),
  contact_phone VARCHAR(20),
  preferred_time VARCHAR(100),         -- 方便时段
  note TEXT,
  
  -- 预约状态
  status VARCHAR(20) DEFAULT 'pending',  -- pending/confirmed/completed/cancelled
  
  -- CRM关联
  crm_task_id VARCHAR(50),            -- 纷享CRM任务ID
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_submissions_campaign ON submissions(campaign_id);
CREATE INDEX idx_submissions_crm_status ON submissions(crm_lead_status);
CREATE INDEX idx_submissions_utm_sales ON submissions(utm_sales);
CREATE INDEX idx_reports_status ON reports(status);
```

#### 2.3 迁移脚本命名
```markdown
迁移脚本命名规范：
V001__init_schema.sql
V002__add_crm_fields.sql
...
```

---

### Step 3：设计后端API（backend_api_design.md）

**必须包含：**

#### 3.1 技术选型
```markdown
## 技术选型

- 运行时：Node.js 18+（与现有profit-web一致）
- 框架：Fastify（轻量高性能）
- ORM：Prisma（与现有prisma一致，降低学习成本）
- 数据库：PostgreSQL（腾讯云RDS或本地PostgreSQL）
- 队列：Redis + Bull（异步任务：PDF生成/CRM推送）
- 认证：JWT（给管理后台用）/ 无需认证（问卷提交端）
```

#### 3.2 API接口设计

```markdown
## API接口设计

### 问卷提交（对外，H5调用）
POST /api/v1/submissions
Content-Type: application/json

Request:
{
  "campaign_id": "uuid",
  "company_name": "...",
  "industry": "...",
  "scale": "...",
  "years": "...",
  "contact_name": "...",
  "contact_phone": "...",
  "answers": [...],  // 原始答案数组
  "utm_sales": "SHUIJIANG",
  "duration_seconds": 180
}

Response (202 Accepted):
{
  "submission_id": "uuid",
  "message": "提交成功，报告生成中",
  "report_url": null  // 稍后轮询
}

### 报告状态查询
GET /api/v1/submissions/:id/report

Response:
{
  "status": "ready|generating|pending",
  "pdf_url": "https://...",  // status=ready时返回
  "expires_at": "2026-04-14T00:00:00Z"
}

### 预约提交
POST /api/v1/bookings
{
  "submission_id": "uuid",
  "contact_name": "...",
  "contact_phone": "...",
  "preferred_time": "工作日上午10点",
  "note": "想聊渠道数字化"
}

### 管理后台：线索列表
GET /api/v1/admin/submissions?page=1&limit=20&level=薄弱

### 管理后台：更新CRM状态
POST /api/v1/admin/submissions/:id/sync-crm
```

#### 3.3 异步任务设计
```markdown
## 异步任务（Bull队列）

### 任务类型

1. GenerateReportJob
   - 输入：submission_id
   - 处理：渲染PDF，存入/uploads/reports/
   - 输出：更新reports表pdf_path

2. SyncCrmJob
   - 输入：submission_id
   - 处理：调用纷享OpenAPI创建/更新线索
   - 输出：更新submissions.crm_lead_id

3. SendNotificationJob
   - 输入：submission_id + type(email|sms|wechat)
   - 处理：发送报告链接给客户
```

#### 3.4 目录结构
```
/opt/marketing-diag/
├── api/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── submissions.ts
│   │   │   ├── reports.ts
│   │   │   ├── bookings.ts
│   │   │   └── admin.ts
│   │   ├── services/
│   │   │   ├── scoring.ts        # 评分引擎（复用H5逻辑）
│   │   │   ├── report.ts         # PDF生成
│   │   │   ├── crm.ts            # 纷享CRM对接
│   │   │   └── notification.ts
│   │   ├── jobs/
│   │   │   ├── report.ts
│   │   │   └── crm.ts
│   │   └── index.ts
│   └── package.json
├── prisma/
│   └── schema.prisma
├── uploads/
│   └── reports/
├── nginx/
│   └── diag.conf
└── pm2.config.js
```

---

### Step 4：设计部署指南（deployment_guide.md）

**必须包含：**

#### 4.1 服务器准备
```markdown
## 服务器准备（腾讯云119.45.205.137）

### 1. 安装PostgreSQL
```bash
sudo apt-get install postgresql postgresql-contrib
sudo -u postgres psql
CREATE DATABASE marketing_diag;
CREATE USER diag_user WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE marketing_diag TO diag_user;
```

### 2. 安装Redis
```bash
sudo apt-get install redis-server
sudo systemctl enable redis-server
```

### 3. 克隆代码
```bash
mkdir -p /opt/marketing-diag
cd /opt/marketing-diag
git clone <repo_url> .
npm install
npx prisma migrate deploy
npx prisma db seed  # 初始化默认campaign
```

### 4. 配置环境变量
```bash
# .env
DATABASE_URL=postgresql://diag_user:password@localhost:5432/marketing_diag
REDIS_URL=redis://localhost:6379
FXIAOKE_APP_ID=your_app_id
FXIAOKE_APP_SECRET=your_app_secret
FXIAOKE_API_URL=https://open.fxiaoke.com
JWT_SECRET=your_jwt_secret
```
```

#### 4.2 Nginx配置
```nginx
server {
    listen 80;
    server_name 119.45.205.137;
    
    location /diag/ {
        proxy_pass http://127.0.0.1:3090/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /diag/uploads/ {
        alias /opt/marketing-diag/uploads/;
        expires 7d;
        add_header Cache-Control "public";
    }
}
```

#### 4.3 PM2配置
```javascript
// pm2.config.js
module.exports = {
  apps: [{
    name: 'marketing-diag',
    script: 'dist/index.js',
    cwd: '/opt/marketing-diag/api',
    env: {
      NODE_ENV: 'production',
      PORT: 3090
    },
    watch: false,
    instances: 1,
    autorestart: true
  }]
};
```

#### 4.4 发布流程
```bash
# 1. 拉取代码
cd /opt/marketing-diag && git pull

# 2. 数据库迁移
npx prisma migrate deploy

# 3. 重启服务
pm2 restart marketing-diag

# 4. 验证
curl http://127.0.0.1:3090/api/v1/health
```

#### 4.5 门禁检查清单
```markdown
## 发布门禁（每次发布前必查）

- [ ] 数据库migration已执行
- [ ] .env文件已配置
- [ ] FXIAOKE API凭证有效
- [ ] Nginx路由已更新
- [ ] PM2进程健康
- [ ] 健康检查接口返回200
- [ ] 验证码机制已开启（防刷）
```

---

### Step 5：设计CRM跟进流程（crm_workflow.md）

**必须包含：**

#### 5.1 线索创建后的标准流程
```markdown
## 线索→商机的标准流程

1. 客户提交问卷
   → H5 POST /api/v1/submissions
   → 后端计算分数
   → 异步生成PDF
   → 异步创建CRM线索

2. 销售收到通知
   → 纷享CRM内收到新线索
   → 分配给对应销售（utm_sales映射）
   → 标注：来源=营销诊断问卷

3. 销售查看报告
   → 登录管理后台
   → 查看线索详情（分数+TOP3问题）
   → 下载完整PDF报告

4. 预约确认
   → 客户预约后创建CRM任务
   → 提醒销售准备
   → 咨询完成后更新线索状态

5. 商机转化
   → 高分线索（≥70）转商机
   → 推进标准销售流程
   → 最终赢单/流失登记
```

#### 5.2 UTM追踪机制
```markdown
## UTM追踪（用于知道哪个销售带来的线索）

### 生成追踪链接
```
https://your-domain.com/diag?campaign=q2&sales=SHUIJIANG
```

参数：
- campaign: 活动ID
- sales: 销售工号

### 追踪流程
1. 销售在CRM导出专属链接/二维码
2. 客户扫码 → 自动携带sales参数
3. 问卷提交时记录utm_sales
4. CRM线索关联销售工号
5. 月底统计各销售带来线索数量和质量
```

#### 5.3 销售管理后台功能
```markdown
## 管理后台功能（非公开，销售内部使用）

### 基础功能
- 线索列表（支持筛选：活动/销售/等级/日期）
- 线索详情（查看答案/分数/报告）
- 手动同步CRM状态

### 高级功能（Phase 2）
- 导出Excel
- 批量操作
- 数据看板（提交量/完成率/预约率/转化率）
```

---

## 非目标

- 不实际部署（设计文档，Agent1/2按此开发）
- 不获取真实的纷享AppId/AppSecret（文档里标注为待确认）
- 不写实际代码（只写接口设计和Schema）

---

## 安全约束

无高危操作。按 AGENTS.md 红线执行即可。

---

## 验收标准自检清单

- [ ] openapi_integration.md：字段映射完整，包含Request示例和待确认清单
- [ ] database_schema.md：5张表DDL完整，包含索引和约束
- [ ] backend_api_design.md：4个API + 3个异步任务 + 目录结构
- [ ] deployment_guide.md：PostgreSQL/Redis/Nginx/PM2/门禁清单
- [ ] crm_workflow.md：5步流程 + UTM追踪 + 后台功能
- [ ] 所有文件路径在 `marketing_diagnosis/system/` 下
- [ ] check-collab.sh通过
