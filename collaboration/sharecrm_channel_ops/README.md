# 纷享销客海外渠道拓展运营管理系统 · 高保真演示原型

面向《海外渠道拓展运营管理系统设计说明书》的**可交互原型**：真实 HTTP API、SQLite 持久化、角色权限、种子数据与导入能力，便于客户演示与现场体验。数据为**虚构样例**，正式项目需替换为脱敏生产数据并做安全审计。

**对象关联、下钻交互与 AI Agent 赋能（角色 × 场景）** 说明见同目录 [`AI_AGENT_ENABLEMENT.md`](./AI_AGENT_ENABLEMENT.md)。

## 能力概览

| 模块 | 说明 |
|------|------|
| 登录与权限 | 管理员 / 总监全局可见；销售仅可见本人负责渠道 |
| **全场景价值图谱** | 长页索引：已具备能力、路线图、分场景售卖、各角色价值（`/v1/demo/value-map-html`） |
| **价值量化 / ROI** | 纯前端对比页：工时节省 + 风险与机会 + 系统年费 → 净收益 / ROI / 回收期（**无新接口**）；交接见 `FORWARD_SHARECRM_AGENT_VALUE_ROI_HANDOFF.md` |
| 运营总览 | 渠道数量、A/B/C、区域、SAM、图表、**演示开场 30 秒**话术 |
| 业务作战台 | 预警 SLA、目标脉搏、优先动作、覆盖缺口 |
| 渠道商 | 列表筛选、**渠道 360°**（信息流/业务流/资金流、业绩洞察、竞品、动态工单）、业务上下文、月度补录、备注、预警 |
| 市场情报 | 各国机会指数、政策/竞品/产品匹配摘要、预置 Markdown 简报 |
| 销售赋能 | 规则型报价计算器（关税/运费/渠道加成假设） |
| 绩效看板 | BSC、区域战报、关注清单、**高管简报一键复制** |
| 数据导入 | JSON/CSV、校验预览、批次审计（`SHARECRM_DEMO_MODE=1` 时隐藏侧栏入口） |

## 线上演示（Agent1 已部署 · Cursor 已探测）

| 项 | 值 |
|----|-----|
| 入口 | [http://119.45.205.137/sharecrm/](http://119.45.205.137/sharecrm/) |
| 健康检查 | `GET http://119.45.205.137/sharecrm/v1/health` → `ok: true`，`service: sharecrm-channel-ops` |
| 说明 | 网关挂在 **`/sharecrm/`** 子路径；前端 `app.js` 内 `apiBase()` 已按此拼接 `/sharecrm/v1/*`。本机根路径部署仍用默认 `""`。 |

> **TLS：** 当前探测 IP 上 `https://` 未成功握手（可能未开 443 或证书）；对外演示若需 HTTPS 请 Agent1 配证书或域名。

## 本地运行

```bash
cd collaboration/sharecrm_channel_ops/api
npm install
npm start
```

浏览器打开：**http://localhost:8790/**

- 首次启动会在空库时自动从 `../data/seed.json` 灌入演示用户、渠道、情报与预警。
- 数据库文件默认：`api/sharecrm_channel.db`（可设环境变量 `SHARECRM_DB_PATH`）。

## 演示账号

| 邮箱 | 角色 | 密码 |
|------|------|------|
| admin@sharecrm.demo | admin | Demo2026! |
| manager@sharecrm.demo | manager | Demo2026! |
| sam.zhang@sharecrm.demo | sales（东南亚） | Demo2026! |
| li.wei@sharecrm.demo | sales（中东欧） | Demo2026! |

## Docker

在 `collaboration/sharecrm_channel_ops/` 目录：

```bash
docker compose up --build
```

访问 http://localhost:8790

## 导入真实数据（预置 / 批量）

1. 按 `data/seed.json` 中 `channels` 单条字段准备 JSON（可增加字段 `owner_user_id` 绑定内部用户 id）。
2. 使用界面「数据导入」，或调用 `POST /v1/import/channels`，请求体：`{ "channels": [ ... ] }`。
3. `channel_code` 必须符合 `SHARECRM-区域大写缩写-至少三位数字`（例：`SHARECRM-SEA-010`）。

上传文件：`POST /v1/import/channels/upload`，multipart 字段名 `file`，内容为同上 JSON。

## 环境变量

| 变量 | 说明 |
|------|------|
| `PORT` | 默认 `8790` |
| `SHARECRM_DB_PATH` | SQLite 路径 |
| `JWT_SECRET` | 签名密钥（生产必须更换） |
| `TOKEN_TTL_SEC` | Token 有效期秒数，默认 7 天 |
| `SHARECRM_DEMO_MODE` | 设为 `1` 或 `true`：隐藏技术向「演示说明」与绩效 JSON 调试、隐藏侧栏「数据与录入」与快捷建档按钮（面向老板演示）；默认关闭 |

**自旧版「硕日 / srne」升级：** 环境变量由 `SRNE_DB_PATH`、`SRNE_DEMO_MODE` 改为上表名称；反代子路径由 `/srne/` 改为 `/sharecrm/`。已有 SQLite 可继续复用：设置 `SHARECRM_DB_PATH` 指向原库文件即可。

## 与生产交付的差距（刻意保留）

- 密码明文存储（仅演示）；生产应使用哈希、MFA、审计与密钥托管。
- 情报与报价为**规则/静态内容**；生产可接爬虫、向量库、ERP 成本与合规校验。
- 未实现完整 GDPR 数据驻留与细粒度字段级权限。

## API 摘要

- `GET /v1/config`（`demo_mode` 等，无需登录）· `GET /v1/demo/value-map-html`（价值图谱 HTML 片段）
- `POST /v1/auth/login` · `GET /v1/me`
- `GET /v1/dashboard/summary` · **`GET /v1/analytics/overview`**（驾驶舱图表：区域出货、月度趋势、TOP 渠道、分级毛利等）
- `GET /v1/channels` · **`POST /v1/channels`**（快捷建渠道，自动生成编码）· `GET/PATCH /v1/channels/:id`
- **`POST /v1/channels/:id/monthly-metrics`**（补录单月出货 `{ ym, revenue_usd }`）
- `GET /v1/users`（负责人下拉，管理员/总监）
- `GET /v1/alerts`（含未关预警 `age_days` 库龄）· `POST /v1/alerts/:id/ack`
- `GET /v1/intel/countries` · `GET /v1/intel/:countryCode`
- `POST /v1/tools/quote`
- `GET /v1/performance/summary` · **`GET /v1/performance/scorecard`**（BSC、区域、关注清单、负责人榜含「未分配」等）
- **`GET /v1/scenarios/playbook`**（关键业务场景：预警 SLA 桶、目标脉搏、覆盖缺口、优先动作清单）
- `GET /v1/channels/:id`（含 **`business_context`**：该国情报摘要、简报标题、未关预警数、提示语；含 **`channel_360`**：`static_profile`、`performance_insight`（近 3 月 vs 前 3 月出货叙事）、`flows` 三列 `{ information, business, financial }` 每项 `{ label, detail }`、`competitors`、`activities`）
- **`POST /v1/channels/:id/competitors`** · **`DELETE /v1/channels/:id/competitors/:cid`**
- **`POST /v1/channels/:id/activities`** · **`PATCH /v1/channels/:id/activities/:aid`**（如 `status`）
- **`GET /v1/import/template`** · `POST /v1/import/channels/preview` · **`GET /v1/import/batches`**
- `POST /v1/import/channels` · `POST /v1/import/channels/upload`

**数据量：** 种子渠道约 **18** 条（含南亚 SCA、更多预警与情报国别）；**首次空库**启动写入 **12 个月**滚动出货曲线。已有旧库不会自动追加种子，需 **导入 JSON** 或 **更换 SQLite 文件** 后重启以体验全量演示。
