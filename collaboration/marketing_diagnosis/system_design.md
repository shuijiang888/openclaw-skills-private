# 企业营销诊断 Skill · 系统架构设计（Phase 1 → MVP）

> 目标链路：**扫码/链接 → 问卷 → 评分 → 《诊断报告》→ 预约 CTA → CRM 线索**。  
> Phase 1（当前）：设计与文档；**不实际部署**（见 HANDOFF 非目标）。

---

## 1. 逻辑架构

```
┌─────────────┐     ┌─────────────┐     ┌──────────────────┐
│  H5/小程序   │────▶│  Submit API │────▶│  Response Store   │
│  问卷前端    │     │  (校验+入库) │     │  (DB/对象存储)    │
└─────────────┘     └──────┬──────┘     └────────┬─────────┘
                           │                      │
                           ▼                      ▼
                    ┌──────────────┐       ┌─────────────┐
                    │ Scoring Engine│──────▶│ Report Gen  │
                    │ (scoring_model)│      │ MD→HTML/PDF │
                    └──────────────┘       └──────┬──────┘
                                                  │
                           ┌──────────────────────┼──────────────────────┐
                           ▼                      ▼                      ▼
                    ┌─────────────┐       ┌─────────────┐       ┌─────────────┐
                    │ 消息推送     │       │ 预约表单     │       │ CRM 线索 API │
                    │ 模板消息/邮件│       │ (二次转化)   │       │ (纷享等)     │
                    └─────────────┘       └─────────────┘       └─────────────┘
```

---

## 2. 组件说明

| 组件 | 职责 | MVP 技术选型 |
|------|------|----------------|
| 问卷前端 | 渲染题目、进度、校验必填、防重复提交 | 静态 H5（Vue/React）或 问卷星/金数据 **嵌入**（快速）；长期自有前端 |
| Submit API | 收 JSON、schema 校验、写库、触发异步任务 | **Node.js (Fastify)** 或 **Python (FastAPI)** |
| Response Store | 存原始答案、提交时间、渠道参数 | PostgreSQL / MySQL；对象存储存 PDF |
| Scoring Engine | 实现 `scoring_model.md` 公式 | 与 API 同语言，**单元测试覆盖每题** |
| Report Gen | 模板渲染 `report_template.md` | Handlebars/Mustache；**Puppeteer** 或 **wkhtmltopdf** 出 PDF |
| 通知 | 报告链接推送 | 企业微信/短信/邮件（腾讯云 SES/SendGrid 等，按合规选型） |
| 预约 | 收集时段意向 | 同 API 新 endpoint 或跳转 Calendly/腾讯会议预约页 |
| CRM | 创建线索、打标签 | **纷享 Open API**（Phase 2），字段：来源=营销诊断、分数、等级、TOP3 摘要 |

---

## 3. 数据模型（简化 ER）

- **Campaign**：`id`, `name`, `q_version`, `utm_*`  
- **Submission**：`id`, `campaign_id`, `answers_json`, `scores_json`, `total`, `level`, `created_at`, `device_fingerprint`  
- **Lead**：`submission_id`, `name`, `phone`, `company`, `intent_note`  
- **Report**：`submission_id`, `md_path`, `pdf_path`, `share_url`, `expires_at`  

---

## 4. API 草案

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/submissions` | body: answers + meta；返回 `submission_id` |
| GET | `/api/v1/submissions/:id/report` | 返回报告状态；就绪则含 `pdf_url` |
| POST | `/api/v1/submissions/:id/booking` | body: 意向时间、备注 |
| POST | `/api/v1/webhooks/crm` | 内部：推送线索到 CRM（异步队列） |

**安全：** HTTPS、限流、CAPTCHA（可选）、敏感字段加密存储、PII 最小化。

---

## 5. 异步与队列

- 提交后：**立即返回 202** + `submission_id`；后台 job 计算分数并生成 PDF。  
- 队列：**Redis + Bull**（Node）或 **Celery**（Python）。

---

## 6. 部署视图（未来）

- **腾讯云轻量 / 云函数 + 托管 DB**（与团队现状对齐即可）。  
- 静态前端：**COS + CDN**，入口绑定企业域名与 **微信小程序 web-view**（若需要）。

---

## 7. MVP 简化路径（HANDOFF 可选方案）

**纯前端 MVP（无后端）：**

- 问卷静态页 + **浏览器内计算分数** + **html2pdf.js** 生成简易 PDF。  
- 线索：**表单 POST 到飞书多维表格 Webhook** 或 **Google Apps Script**。  

**缺点：** 易篡改分数、难审计；仅适合内测/演示。正式对客户建议走 Submit API + 服务端计分。

---

## 8. OpenClaw / Skill 集成设想（Phase 2）

- Skill 提供：`load questionnaire_design`、`run scoring`、`render report` 工具（读本目录 Markdown 为单一事实源）。  
- 人类在 OpenClaw 侧触发「为客户 XXX 生成诊断」→ 拉取 `Submission` → 输出报告与跟进任务。

---

## 9. 非目标（系统实现阶段仍遵守）

- Phase 1 不部署、不调付费外部 API、不采真实客户数据。  
- 评分与等级阈值上线前须校准（见 `scoring_model.md`）。
