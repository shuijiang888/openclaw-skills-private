# Agent 双模式架构规范（Standalone + CRM Integrated）

**版本**: v1.1  
**目标**: 同一套系统可独立运行，也可与公司 SaaS CRM 无缝整合。  
**原则**: Agent Core 不依赖 CRM，CRM 通过 Connector 可插拔接入。
**当前 Owner 决策**: 先 Standalone 上线，后续优先对接纷享销客 OpenAPI（灰度启用）。

---

## 1. 架构总览

```text
用户入口层
  微信/企微 | H5 | PC/Mac Web
        |
API Gateway + Auth + RBAC
        |
Agent Core（固定）
  ├─ Ingestion Agent（多模态接收）
  ├─ Understanding Agent（ASR/OCR/视觉摘要）
  ├─ Scoring Agent（优先级评分）
  ├─ Action Agent（动作卡生成）
  ├─ Task Agent（任务众包）
  ├─ Reward Agent（积分与荣誉）
  └─ Learning Agent（闭环学习）
        |
Connector Layer（可插拔）
  ├─ None（Standalone）
  ├─ 纷享销客 OpenAPI Connector（优先）
  ├─ CRM Connector B
  └─ Custom OpenAPI Connector
```

---

## 2. 模式定义

### 2.1 Standalone 模式
- 不依赖外部 CRM。
- 系统内维护轻量客户主档、机会、任务与知识资产。
- 适合快速试点、代理商场景、低集成预算组织。

### 2.2 Integrated 模式
- 读取 CRM 客户、联系人、商机、组织等主数据。
- 将 Agent 产出（高价值情报、动作建议、执行结果）回写 CRM。
- 适合已有成熟 CRM 流程的总部与规模团队。
- 当前建议优先实施: 纷享销客 OpenAPI 入站只读，稳定后再开出站回写。

---

## 3. 主数据边界（避免冲突）

### CRM 作为主数据（建议）
- 客户、联系人、商机阶段、销售组织关系

### Agent 作为主数据
- 多模态情报原始资产
- AI 结构化结果与评分
- 动作卡、任务、回填结果
- 荣誉、积分、表彰内容
- 复盘知识与证据链

---

## 4. 同步策略

### 4.1 入站（CRM -> Agent）
- 定时增量拉取（例如每 5/15 分钟）
- Webhook 实时事件（新商机、阶段变更、客户更新）

### 4.2 出站（Agent -> CRM）
- 关键情报写入 CRM 活动记录
- 动作建议写入跟进任务
- 执行回填写入商机备注或自定义字段

### 4.3 冲突处理
- 字段主权优先（由主系统决定）
- 时间戳冲突解决
- 保留冲突日志供人工复核

---

## 5. 字段映射最小集（示例）

| Agent 字段 | CRM 字段 | 方向 | 说明 |
| --- | --- | --- | --- |
| external_company_id | account.id | 双向 | 客户唯一键 |
| external_contact_id | contact.id | 双向 | 联系人唯一键 |
| opportunity_stage | opportunity.stage | 双向 | 机会阶段 |
| signal_priority | custom.signal_priority | Agent -> CRM | P0/P1/P2 |
| action_card_summary | task.description | Agent -> CRM | 任务摘要 |
| action_due_at | task.due_at | Agent -> CRM | 截止时间 |
| action_feedback | custom.action_feedback | Agent -> CRM | 执行结果 |

---

## 6. 权限与审计要求

- 集成读写采用专用服务账号。
- 回写必须可追溯（谁触发、写入字段、写入时间）。
- 对敏感字段采用白名单写入，不允许任意映射。
- Connector 所有失败记录进入重试队列与死信队列。

---

## 7. 容错与降级

### CRM 不可用时
- Agent Core 继续工作（本地缓存 + 待同步队列）。
- 前端显示“外部同步延迟”提示，不阻断用户主流程。

### 同步失败策略
- 指数退避重试（最多 N 次）
- 失败转人工处理队列
- 每日对账报告（缺失写入、冲突条目）

---

## 8. 上线顺序建议

1. 先 Standalone 跑通完整闭环（输入 -> 动作 -> 回填 -> 激励）  
2. 再接 CRM 只读（入站，优先纷享销客 OpenAPI）  
3. 最后开 CRM 回写（出站）并做灰度开关  

### 8.1 纷享销客 OpenAPI 对接最小步骤
1. 申请并配置纷享销客 OpenAPI 应用凭据（最小权限）。  
2. 建立客户/联系人/商机三类字段映射（先只读拉取）。  
3. 开启增量同步任务与失败重试队列。  
4. 验证主键一致性与去重，再开启回写白名单字段。  
5. 回写仅从低风险字段开始，逐步扩大覆盖范围。

---

## 9. 验收标准

- 不接 CRM 时系统可独立达成核心业务目标。
- 接 CRM 后无数据重复与主键冲突。
- 回写成功率满足上线阈值，失败可追踪可补偿。
- 权限与审计可通过内部检查。

---

## 10. 修订记录

| 版本 | 日期 | 说明 |
| --- | --- | --- |
| v1.0 | 2026-04-03 | 首版 |
| v1.1 | 2026-04-03 | 明确 Owner 决策：先独立运行，后续优先对接纷享销客 OpenAPI |

---

*文档结束*
