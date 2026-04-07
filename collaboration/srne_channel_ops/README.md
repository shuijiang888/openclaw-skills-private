# 硕日海外渠道拓展运营管理系统 · 高保真演示原型

面向《海外渠道拓展运营管理系统设计说明书》的**可交互原型**：真实 HTTP API、SQLite 持久化、角色权限、种子数据与导入能力，便于客户演示与现场体验。数据为**虚构样例**，正式项目需替换为脱敏生产数据并做安全审计。

## 能力概览

| 模块 | 说明 |
|------|------|
| 登录与权限 | 管理员 / 总监全局可见；销售仅可见本人负责渠道 |
| 运营总览 | 渠道数量、A/B/C、区域、SAM、活跃渠道出货汇总、未处理预警 |
| 渠道商 | 列表筛选、详情、近 6 月出货曲线、备注保存、预警确认 |
| 市场情报 | 各国机会指数、政策/竞品/产品匹配摘要、预置 Markdown 简报 |
| 销售赋能 | 规则型报价计算器（关税/运费/渠道加成假设） |
| 绩效看板 | 按 A/B/C 聚合的演示指标 |
| 数据导入 | JSON 提交或上传文件；`channel_code` 冲突则更新（管理员/总监） |

## 线上演示（Agent1 已部署 · Cursor 已探测）

| 项 | 值 |
|----|-----|
| 入口 | [http://119.45.205.137/srne/](http://119.45.205.137/srne/) |
| 健康检查 | `GET http://119.45.205.137/srne/v1/health` → `ok: true`，`service: srne-channel-ops` |
| 说明 | 网关挂在 **`/srne/`** 子路径；前端 `app.js` 内 `apiBase()` 已按此拼接 `/srne/v1/*`。本机根路径部署仍用默认 `""`。 |

> **TLS：** 当前探测 IP 上 `https://` 未成功握手（可能未开 443 或证书）；对外演示若需 HTTPS 请 Agent1 配证书或域名。

## 本地运行

```bash
cd collaboration/srne_channel_ops/api
npm install
npm start
```

浏览器打开：**http://localhost:8790/**

- 首次启动会在空库时自动从 `../data/seed.json` 灌入演示用户、渠道、情报与预警。
- 数据库文件默认：`api/srne_channel.db`（可设环境变量 `SRNE_DB_PATH`）。

## 演示账号

| 邮箱 | 角色 | 密码 |
|------|------|------|
| admin@srne.demo | admin | Demo2026! |
| manager@srne.demo | manager | Demo2026! |
| sam.zhang@srne.demo | sales（东南亚） | Demo2026! |
| li.wei@srne.demo | sales（中东欧） | Demo2026! |

## Docker

在 `collaboration/srne_channel_ops/` 目录：

```bash
docker compose up --build
```

访问 http://localhost:8790

## 导入真实数据（预置 / 批量）

1. 按 `data/seed.json` 中 `channels` 单条字段准备 JSON（可增加字段 `owner_user_id` 绑定内部用户 id）。
2. 使用界面「数据导入」，或调用 `POST /v1/import/channels`，请求体：`{ "channels": [ ... ] }`。
3. `channel_code` 必须符合 `SRNE-区域大写缩写-至少三位数字`（例：`SRNE-SEA-010`）。

上传文件：`POST /v1/import/channels/upload`，multipart 字段名 `file`，内容为同上 JSON。

## 环境变量

| 变量 | 说明 |
|------|------|
| `PORT` | 默认 `8790` |
| `SRNE_DB_PATH` | SQLite 路径 |
| `JWT_SECRET` | 签名密钥（生产必须更换） |
| `TOKEN_TTL_SEC` | Token 有效期秒数，默认 7 天 |

## 与生产交付的差距（刻意保留）

- 密码明文存储（仅演示）；生产应使用哈希、MFA、审计与密钥托管。
- 情报与报价为**规则/静态内容**；生产可接爬虫、向量库、ERP 成本与合规校验。
- 未实现完整 GDPR 数据驻留与细粒度字段级权限。

## API 摘要

- `POST /v1/auth/login` · `GET /v1/me`
- `GET /v1/dashboard/summary` · **`GET /v1/analytics/overview`**（驾驶舱图表：区域出货、月度趋势、TOP 渠道、分级毛利等）
- `GET /v1/channels` · **`POST /v1/channels`**（快捷建渠道，自动生成编码）· `GET/PATCH /v1/channels/:id`
- **`POST /v1/channels/:id/monthly-metrics`**（补录单月出货 `{ ym, revenue_usd }`）
- `GET /v1/users`（负责人下拉，管理员/总监）
- `GET /v1/alerts` · `POST /v1/alerts/:id/ack`
- `GET /v1/intel/countries` · `GET /v1/intel/:countryCode`
- `POST /v1/tools/quote`
- `GET /v1/performance/summary`
- **`GET /v1/import/template`**（导入 JSON 模板）
- `POST /v1/import/channels` · `POST /v1/import/channels/upload`

**数据量：** 种子渠道约 **18** 条（含南亚 SCA、更多预警与情报国别）；**首次空库**启动写入 **12 个月**滚动出货曲线。已有旧库不会自动追加种子，需 **导入 JSON** 或 **更换 SQLite 文件** 后重启以体验全量演示。
