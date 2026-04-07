# 通用行业营销诊断系统 — 上线作战清单（打勾版）

> 适用范围：营销诊断通用系统（`diag_submission / diag_lead / diag_sync_job / diag_daily_stat`）  
> 使用方式：上线会议中逐条勾选，未勾选项不得发布。  
> 口径优先级：若 PR #4 已合并，以主线代码与主线文档为准。

---

## 0. 基线信息（发布前先填）

- [ ] 发布日期：`____-__-__`
- [ ] 发布窗口：`__ : __` - `__ : __`
- [ ] 发布 Owner（唯一）：`________`
- [ ] 发布 SHA（唯一）：`________`
- [ ] 回滚基线 SHA：`________`
- [ ] 影响范围：`H5 / API / DB / 网关 / Nginx`（圈定）

---

## 1. 角色与责任（必须明确 DRI）

- [ ] 总 Owner（Go/No-Go）：`________`
- [ ] 后端 DRI（API + DB）：`________`
- [ ] 前端 DRI（H5 + 门户入口）：`________`
- [ ] 云资源 DRI（腾讯云 + 域名证书 + 密钥）：`________`
- [ ] 验收 DRI（功能与回滚签字）：`________`

---

## 2. 资源与环境就绪检查（缺一不可）

### 2.1 腾讯云与网络
- [ ] API 域名可解析（如：`diag-api.xxx.com`）
- [ ] TLS 证书有效（未过期）
- [ ] 安全组/防火墙已放通必要端口
- [ ] 网关/反向代理路由已配置（`/v1/*`）

### 2.2 数据库与密钥
- [ ] 独立数据库实例可连接
- [ ] 应用账号最小权限配置完成
- [ ] `DATABASE_URL`/相关环境变量已注入
- [ ] CRM 密钥仅服务端可见（前端不可见）

### 2.3 应用配置
- [ ] 三个 H5 的 `CONFIG.apiBaseUrl` 已指向目标 API
- [ ] `industryEdition`、`questionnaireVersion`、`scoringModelVersion` 已配置
- [ ] 门户卡片指向：
  - [ ] `/diag/h5_medical.html`
  - [ ] `/diag/h5_energy.html`
  - [ ] `/diag/h5_manufacturing.html`

---

## 3. 数据结构与迁移检查

- [ ] `diag_submission` 已创建
- [ ] `diag_lead` 已创建（含 `lead_kind`）
- [ ] `diag_sync_job` 已创建
- [ ] `diag_daily_stat` 已创建（如启用）
- [ ] `lead_kind` 约束生效（仅允许 `diagnosis_summary` / `expert_opportunity`）
- [ ] `payload_json` 字段可正常写入（submission + lead）

---

## 4. 联调与功能门禁（必须全绿）

### 4.1 静态页面可用性
- [ ] `GET /diag/h5_medical.html` => 200
- [ ] `GET /diag/h5_energy.html` => 200
- [ ] `GET /diag/h5_manufacturing.html` => 200
- [ ] 响应为明文 HTML（首字节 `<`，非 Base64）
- [ ] Content-Type 含 `text/html; charset=utf-8`

### 4.2 API 可用性
- [ ] `GET /v1/health` => 200
- [ ] `POST /v1/submissions` => 200 且返回 `submissionId`
- [ ] `GET /v1/submissions/:id` => 200 且返回报告快照
- [ ] `POST /v1/leads`（`leadKind=expert_opportunity`）=> 200
- [ ] `POST /v1/leads`（`leadKind=diagnosis_summary`）=> 200
- [ ] 非法 `leadKind` => 4xx（校验生效）

### 4.3 业务流验收
- [ ] 轻诊断 10 步 -> 初估 -> 续答 完整流程通过
- [ ] Q_B2 多选在报告展示正确
- [ ] 点击专家按钮先弹窗再提交/跳转
- [ ] localStorage 断点续答可恢复

---

## 5. 监控与日志门禁

- [ ] API 访问日志可检索（含 requestId）
- [ ] 错误日志可检索（4xx/5xx）
- [ ] 手机号/隐私字段已脱敏（日志中不明文）
- [ ] 关键指标看板可见（提交量、成功率、错误率）

---

## 6. 发布执行步骤（建议顺序）

1. [ ] 冻结发布窗口，通知相关人（Owner 发起）
2. [ ] 部署数据库迁移（后端 DRI）
3. [ ] 部署 API 服务（后端 DRI）
4. [ ] 发布/覆盖三行业 H5（前端 DRI）
5. [ ] 更新门户入口（前端 DRI）
6. [ ] 执行门禁脚本与手工探针（验收 DRI）
7. [ ] Owner 宣布 Go/No-Go

---

## 7. 回滚预案（上线前必须演练口令）

### 7.1 回滚触发条件（任一满足即回滚）
- [ ] API 5xx 持续超过阈值（例如 5 分钟）
- [ ] 核心提交接口不可用
- [ ] 数据写入异常（字段缺失/约束失效）

### 7.2 回滚动作
1. [ ] 回滚 API 到回滚基线 SHA/镜像
2. [ ] 回滚 H5 静态文件到上版本
3. [ ] 恢复网关路由（如有改动）
4. [ ] 发布回滚公告并记录事故单

> 注意：数据库迁移优先采用向前兼容策略，避免破坏性回退。

---

## 8. 上线后 30 分钟观察

- [ ] 提交成功率 >= 目标阈值
- [ ] 平均响应时间在阈值内
- [ ] 无异常峰值 4xx/5xx
- [ ] 线索写入正常（`lead_kind` 两类均有样本）
- [ ] Owner 完成上线确认并归档结果

---

## 9. 最终签字

- [ ] 后端 DRI 签字：`________`
- [ ] 前端 DRI 签字：`________`
- [ ] 验收 DRI 签字：`________`
- [ ] 发布 Owner 签字：`________`

