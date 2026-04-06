# 纷享销客 OpenAPI 对接方案（营销诊断 → CRM）

> 供 Agent1/2 实现 `services/crm.ts` 时对照。路径与字段以 **纷享开放平台实际文档** 为准，本文含 **待确认项**。  
> 参考：`scoring_model.md`、`report_template.md`、`mvp/h5_questionnaire.html` 提交载荷。

---

## 1. API 基础

| 项 | 说明 |
|----|------|
| **开放平台** | [https://open.fxiaoke.com/](https://open.fxiaoke.com/)（文档入口、应用管理、权限范围以控制台为准） |
| **认证** | 典型模式：`AppId` + `AppSecret`（或企业 CorpId + Secret）换取 **AccessToken**；具体参数名以官方文档为准 |
| **Token 生命周期** | 常见 **约 2 小时**；需 **进程内缓存 + 过期前刷新**（建议 TTL 预留 5～10 分钟余量） |
| **调用方式** | HTTPS JSON；`Content-Type: application/json`；签名/时间戳若文档要求则实现 |
| **环境** | 生产与沙箱 Base URL 可能不同，由老江在控制台确认 |

### 1.1 核心接口（示例路径 · 需替换为真实接口）

以下路径为 **设计占位**，上线前必须在开放平台文档中核对 **实际 path 与版本号**。

| 能力 | 方法 | 示例路径 | 用途 |
|------|------|----------|------|
| 获取 Token | POST | `/cgi/oauth2/access_token` 或文档等价路径 | 换取 access_token |
| 创建线索 | POST | `/crm/v2/object/lead/create` 或文档等价 | 问卷提交后创建线索对象 |
| 更新线索 | POST/PATCH | `/crm/v2/object/lead/update` | 补充分数、等级、预约状态、自定义字段 |
| 创建商机（可选） | POST | `/crm/v2/object/opportunity/create` | 高分线索转商机（Phase 2） |
| 查询用户 | POST | `/crm/v2/user/list` 或文档等价 | 销售工号 / 邮箱 → CRM `userId`，用于负责人分配 |

> 纷享对象模型多为 **自定义对象 + 字段 API 名称**；下表字段名需在租户后台 **对象管理** 中创建后回填。

---

## 2. 问卷字段 → 纷享 CRM 字段映射

| 问卷/H5 字段 | 建议 CRM API 字段 / 含义 | 说明 |
|--------------|-------------------------|------|
| `basic.name`（QB1） | `company_name` / 客户名称 | 必填 |
| `basic.industry`（QB2） | `industry` 或选项集 | 与 H5 选项对齐；需 CRM 下拉值映射表 |
| `basic.scale`（QB3） | `employee_size` 或自定义 | 50人以下 / 50-200… → CRM 选项值 |
| `basic.years`（QB4） | `establish_years` 或自定义 | 成立年限选项映射 |
| `contact.name`（Q25） | `name` / 联系人姓名 | 必填 |
| `contact.phone` | `mobile` / 手机 | 必填，可校验大陆手机号 |
| `contact.company` | 若与 QB1 不一致可写备注字段 | 默认与 QB1 一致 |
| `score_total` | `diagnosis_score`（Number 自定义字段） | 综合分 0–100 |
| `score_level` | `diagnosis_level`（单选） | 卓越/良好/一般/薄弱/危机 |
| `top3_text` | `diagnosis_top3`（多行文本） | TOP3 维度摘要拼接 |
| `score_d1`…`score_d6` | `diagnosis_d1`…`diagnosis_d6` 或 JSON 扩展字段 | 加权分 |
| 固定文案 | `lead_source` | 固定：`营销诊断问卷` |
| `utm_sales` | 映射为 `owner_id` / 负责人 | 查用户接口将工号 → userId |
| `campaign_id` | 自定义 `campaign_id` 或备注 | 活动归因 |
| `submission_id` | 自定义 `external_submission_id` | 幂等与对账 |

### 2.1 行业/规模与 CRM 选项映射（实现时维护）

建议在服务端维护 `YAML/JSON` 映射表，例如 H5「制造业」→ CRM 选项 code `IND_MANUFACTURING`（示例），**以租户实际选项为准**。

---

## 3. 线索创建 Request 示例（JSON）

```json
{
  "object_describe_api_name": "LeadsObj",
  "record": {
    "name": "李总",
    "mobile": "13800138000",
    "company_name": "深圳市XX科技有限公司",
    "industry": "IT/互联网",
    "employee_size": "100-500人",
    "diagnosis_score": 72,
    "diagnosis_level": "良好",
    "diagnosis_top3": "1. 获客渠道与线索质量\n2. 销售管道与赢单率\n3. 数字化工具与数据应用",
    "lead_source": "营销诊断问卷",
    "utm_sales_code": "SHUIJIANG",
    "owner_id": "USER_ID_FROM_LOOKUP",
    "diagnosis_d1": 15,
    "diagnosis_d2": 14,
    "diagnosis_d3": 13,
    "diagnosis_d4": 10,
    "diagnosis_d5": 9,
    "diagnosis_d6": 6,
    "external_submission_id": "uuid-of-submission"
  }
}
```

> 实际请求体字段名须与 **纷享对象 API 名称** 一致；若为嵌套 `data` / `entity` 结构，按文档包装一层。

---

## 4. 同步策略与错误处理

1. **异步队列**：`SyncCrmJob` 消费；失败 **指数退避** 重试（如 1m/5m/30m），超过次数写入 `crm_sync_log` 并告警。  
2. **幂等**：以 `submission_id` 为业务键；已存在 `crm_lead_id` 时走 **更新** 而非重复创建。  
3. **部分成功**：先落库 `submissions`，再推 CRM；CRM 失败不影响客户看到报告（报告 URL 已生成）。  
4. **PII**：日志中手机号打码；AppSecret 仅环境变量。

---

## 5. 待老江 / 运维提供（部署前必须确认）

1. 纷享 **AppId、AppSecret**（或当前租户采用的认证参数）及 **CorpId**（若需要）。  
2. OpenAPI **真实 Base URL**（生产/测试）。  
3. 线索对象上 **自定义字段** 是否已创建：`diagnosis_score`、`diagnosis_level`、`diagnosis_top3`、`diagnosis_d1`～`d6`、`external_submission_id` 等。  
4. **负责人分配规则**：按 `utm_sales` 自动映射负责人，还是统一进公海由运营分配。  
5. **接口限频** 与 **并发配额**，以便设置队列并发数。  
6. 是否需 **审批流** 才能创建线索（若有，异步任务需兼容「待审批」状态）。

---

## 6. 与 H5 改造关系

- H5 在 `POST /api/v1/submissions` 成功（202）后 **仅展示 `submission_id` 与轮询说明**；不再承担 CRM 调用。  
- `utm_sales`、`campaign_id` 从 URL Query 注入（见 `crm_workflow.md`）。
