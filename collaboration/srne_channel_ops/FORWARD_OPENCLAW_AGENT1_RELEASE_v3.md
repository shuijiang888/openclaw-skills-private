# 硕日渠道运营原型 · 第三轮发布（转发 OpenClaw + Agent1）

**文档用途：** 业务方将本文 **整段转发** 给 OpenClaw 与 Agent1；OpenClaw 负责 **代码同步与触发部署**，Agent1 负责 **拉取、构建、上线与验收回传**。  
**发布代号：** SRNE v3（市场情报增强 + 渠道 360° + 三流叙事）  
**日期：** 2026-04-08（以实际推送日为准）

---

## 一、给 OpenClaw 的协作说明（请先执行）

1. **确认源：** Cursor 侧交付在仓库路径 `collaboration/srne_channel_ops/`（含 `api/server.mjs`、`web/*`、`data/seed.json`、`README.md` 等）。
2. **同步到部署用仓库：** 将含本轮改动的提交 **合并/推送** 到 Agent1 实际 `pull` 的分支（建议与历史一致：`feature/srne-channel-ops` 或团队约定主分支）。
3. **记录 SHA：** 推送后记下 **`git rev-parse HEAD`**（短 SHA 即可），写入下方「版本锚点」或回传群。
4. **通知 Agent1：** 明确一句——「请按 `FORWARD_OPENCLAW_AGENT1_RELEASE_v3.md` + `AGENT1_发布_直观清单.md` 执行发布；代码已更新到 SHA ______」。
5. **阻塞时：** 若私库与 open 不同步，按既有流程打 **`collaboration/cursor-out/srne_channel_ops_*.tar.gz`** 或等价制品，并更新 `cursor-out/AGENT1_SRNE_INGEST_AND_DEPLOY.md` 中的文件名与校验说明。

**OpenClaw 完成后请回传（可复制）：**

```
已推送分支：________________
Git SHA：________________
Agent1 已 @ / 已发任务单：是 / 否
```

---

## 二、给 Agent1 的发布范围（第三轮增量）

在 **v2（绩效 scorecard + 导入预览/批次）** 基础上，本轮新增/强化包括但不限于：

| 类别 | 内容 |
|------|------|
| **市场情报** | `market_intel` 扩展字段；`intel_note` 表；`GET /v1/intel/countries` 国别列表增强；`GET/PATCH /v1/intel/:cc`；`POST /v1/intel/:cc/notes`；详情 `cross_links` / `intel_notes` 等（以 `server.mjs` 为准）。 |
| **渠道 360°** | `GET /v1/channels/:id` 响应增加 **`channel_360`**：`static_profile`、`performance_insight`（近 3 月 vs 前 3 月叙事）、**`flows`**（`information` / `business` / `financial` 三列，每项 `label` + `detail`）、`competitors`、`activities`。 |
| **竞品与活动** | `POST/DELETE /v1/channels/:id/competitors`；`POST /v1/channels/:id/activities`；`PATCH .../activities/:aid`（如 `status`）。 |
| **库结构** | 进程启动时执行迁移：`migrateIntelV2()`（含 `intel_note` 等）、`migrateChannel360()`（`channel_competitor`、`channel_activity`）。**现有 SQLite 无需手工删库**，重启新版本即可 `CREATE TABLE IF NOT EXISTS` / `ALTER`（与现实现一致）。 |
| **前端** | 渠道详情页 **`#ch360Mount`**：三流面板、业绩洞察、静态摘要、竞品与动态工单、跳转情报/报价/作战台。 |
| **种子** | `data/seed.json` 可含 `channel_competitors`、`channel_activities`（若存在则在 `ensureSeed` 中写入）。 |

**须一并发布的制品路径（与 v2 相同）：**  
`collaboration/srne_channel_ops/` 整包；Docker **build context = 该目录**，勿仅用 `api/`。

---

## 三、Agent1 执行步骤（摘要）

详细命令与勾选项仍以 **`AGENT1_发布_直观清单.md`** 为准；本轮在构建前 **额外** 建议在宿主机执行：

```bash
grep -q 'channel_360' collaboration/srne_channel_ops/api/server.mjs && echo "OK channel_360"
grep -q '/v1/channels/.*/competitors' collaboration/srne_channel_ops/api/server.mjs && echo "OK competitors route"
grep -q 'ch360Mount' collaboration/srne_channel_ops/web/index.html && echo "OK ch360 DOM"
```

然后：`docker compose build --no-cache` → `up -d`（或等价流程）；确认 **`SRNE_DB_PATH` 卷挂载**、`JWT_SECRET` 已替换。

---

## 四、验收清单（请 Agent1 回传）

**接口（带 Bearer，替换 `BASE` 为实际前缀，如 `http://IP/srne`）**

1. `GET $BASE/v1/health` → 200，`ok: true`。
2. 登录后 `GET $BASE/v1/channels/1`（或任意可见渠道 id）→ JSON 中含 **`channel_360`**，且 `flows.information`、`flows.business`、`flows.financial` 为非空数组（或结构与代码一致）。
3. `GET $BASE/v1/intel/countries` → 200；任选一国 `GET $BASE/v1/intel/XX` → 200。

**浏览器（`admin@srne.demo` / `Demo2026!`）**

4. **渠道** → 打开任一渠道详情：可见 **「渠道 360° · 信息流/业务流/资金流」** 三列及下方业绩洞察、竞品/活动区（非空白报错页）。
5. **市场情报**：列表与详情仍可用；硬刷新避免缓存旧 `app.js`。

**运维**

6. 重启后数据仍在；回传 **部署 URL**、**是否 HTTPS**、**Git SHA 或镜像 tag**、**JWT_SECRET 是否已换**。

---

## 五、参考文档（同目录）

| 文件 | 说明 |
|------|------|
| `AGENT1_发布_直观清单.md` | 按步构建、curl、浏览器检查（v2 基线 + 本文第三轮补充） |
| `RELEASE_REQUEST_FOR_AGENT1.md` | 累计功能与完整验收长版 |
| `README.md` | API 摘要与本地运行 |
| `collaboration/STATUS.md` | 协作状态摘要 |

---

## 六、版本锚点（推送后填写）

```
主仓 Git SHA：05f8121（由 OpenClaw 或 Agent1 在 pull 后填写）
部署 URL：________________
```

---

**文档版本：** v3 · 市场情报 v2 + 渠道 360° + 三流前端
