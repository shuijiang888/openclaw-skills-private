# 发布诉求 · 硕日海外渠道运营原型（转发 Agent1）

> **Agent1 若优先要「按步骤执行」：** 请先读 **`AGENT1_发布_直观清单.md`**（短清单 + 命令 + 浏览器勾选项）。本文是功能与验收的**详细版**。

> **用途：** 将 Cursor 侧已完成的**多轮增强**同步到部署环境并**重新发布**；请 Agent1 拉取/解压最新 `collaboration/srne_channel_ops/` 后按本文验收并回传 URL 与结果。  
> **当前线上风险：** 若服务器仍为早期镜像或旧静态文件，**绩效看板 / 数据导入** 仍表现为简陋版；必须更新 **API（`server.mjs`）+ `web/*`** 后新功能才可见。

---

## 一、发布范围（累计功能）

### 1. 基础原型（首版）

- Fastify + SQLite；同进程托管 `web/` 静态与 `GET/POST /v1/*`。
- 认证、渠道 CRUD、情报、预警、报价工具、角色可见范围（销售仅看自己负责渠道）。
- 种子数据 `data/seed.json`：首次空库自动灌入用户/渠道/情报/预警等。

### 2. 第一轮 · 体验与数据增强

- **驾驶舱图表：** `GET /v1/analytics/overview`（区域出货、月度趋势、TOP 渠道、分级毛利等）；前端 Chart.js 与总览联动。
- **快捷建渠道：** `POST /v1/channels`（自动生成编码等）。
- **月度补录：** `POST /v1/channels/:id/monthly-metrics`；种子侧为全渠道补全多个月度数据，便于图表饱满。
- **网关子路径：** 公网入口为 **`/srne/`** 时，前端 `app.js` 中 `apiBase()` 已拼接 **`/srne/v1/*`**；本机根路径部署仍为默认前缀 `""`。
- **门户：** 营销诊断门户首页「硕日能源」卡片指向约定公网入口（以实际部署 URL 为准）。

### 3. 第二轮 · 绩效看板 + 数据导入（实战向）

**绩效看板**

- **接口：** `GET /v1/performance/scorecard`  
  返回包括但不限于：BSC 四象限得分、区域战报、**关注清单**（低活跃+高预警等）、**负责人榜**、渠道生命周期分布、预警类型聚合、近 12 个月收入趋势等。
- **前端：** 多面板（BSC 卡片、区域/月度图、关注清单、负责人表、明细表、**会议叙事**文案便于周会复制）。

**数据导入**

- **预览校验：** `POST /v1/import/channels/preview` — 逐行校验（编码、国家、区域、`owner_email` 等），返回 `row_ok` / `row_err` 与每行 `issues`。
- **确认写入：** 仍使用 `POST /v1/import/channels`（或既有 upload 流程）；写入成功时落 **`import_batch`** 审计行（操作者、时间、成功/失败行数、摘要 JSON）。
- **批次查询：** `GET /v1/import/batches`。
- **模板说明：** `GET /v1/import/template`（含 `field_spec` 等）。
- **前端：** 导入工作台 — 校验结果表 → 确认写入 → **最近导入批次**列表。

**数据库**

- 启动时 **`CREATE TABLE IF NOT EXISTS import_batch`**；**无需删库**；旧库升级后首次请求即建表。

---

## 二、须同步的制品路径（相对仓库根）

| 类型 | 路径 |
|------|------|
| 后端 | `collaboration/srne_channel_ops/api/server.mjs`、`package.json`、`package-lock.json` |
| 前端 | `collaboration/srne_channel_ops/web/index.html`、`app.js`、`styles.css` |
| 种子 | `collaboration/srne_channel_ops/data/seed.json` |
| 容器 | `collaboration/srne_channel_ops/Dockerfile`、`docker-compose.yml`（可选） |

**构建上下文：** 与 `FORWARD_TO_AGENT1_CLOUD_DEPLOY.md` 一致 — Docker **build context = `collaboration/srne_channel_ops/`**，勿仅用 `api/`。

**离线同步：** 若对方仓库暂无最新提交，可用 OpenClaw/管道同步后的 **`collaboration/cursor-out/srne_channel_ops_*.tar.gz`**（若有更新包请以最新 ingest 说明为准），或 `git pull` 含上述文件的提交。

---

## 三、运行时与环境（复述）

- `PORT` 默认 `8790`；**`SRNE_DB_PATH`** 持久化 SQLite；**`JWT_SECRET`** 生产强随机。
- 反代在 **`/srne/`** 子路径时，需保证静态与 API 前缀与现网一致（前端已按 `/srne` 适配 `apiBase()`）。
- 详细变量与红线见：`FORWARD_TO_AGENT1_CLOUD_DEPLOY.md`、`README.md`。

---

## 四、发布验收清单（请 Agent1 回传）

**基础**

1. 公网 URL 可打开登录页；**`GET {origin}/…/v1/health`**（注意子路径时为 `…/srne/v1/health`）200 且 `ok: true`。
2. `admin@srne.demo` / `Demo2026!` 登录成功；总览有数据（渠道数、预警等）。

**第一轮相关**

3. 总览页图表加载正常（无控制台致命报错）；`GET …/v1/analytics/overview` 200 且字段非空（与种子一致）。
4. 快捷建渠道、单月补录（若界面有入口）可用。

**第二轮相关（本次发布重点）**

5. **`GET …/v1/performance/scorecard`**（带 Bearer）：200，且含 `bsc`、`region_scorecard`、`watchlist` 等关键字段。
6. **数据导入页：** 可先调用 **`POST …/v1/import/channels/preview`** 提交含故意错误行的列表，界面显示 `row_err` 与 issues；再提交合法数据 **`POST …/v1/import/channels`**，**`GET …/v1/import/batches`** 能看到新批次。
7. **绩效看板页：** BSC/区域图/关注清单/负责人榜/会议叙事等区域可见且与接口数据一致。

**运维**

8. 重启容器/进程后数据仍在（`SRNE_DB_PATH` 卷挂载正确）。
9. 回传：最终 HTTPS URL、`JWT_SECRET` 是否已替换、部署方式、**Git SHA 或镜像 tag**。

---

## 五、已知限制（不必阻塞发版，可备注）

- CSV 导入为简单逗号切分；单元格内勿含英文逗号（或改用 JSON 导入）。
- 负责人榜当前仅包含有负责人的渠道（INNER JOIN）；无负责人渠道不出现在该表。

---

## 六、参考文档

- 协同与 Docker：`FORWARD_TO_AGENT1_CLOUD_DEPLOY.md`
- 离线 ingest：`collaboration/cursor-out/AGENT1_SRNE_INGEST_AND_DEPLOY.md`
- API 与账号：`README.md`
- 协作状态摘要：`collaboration/STATUS.md`

---

**文档版本：** v2 · 含绩效 scorecard + 导入预览/批次审计 + 累计验收项
