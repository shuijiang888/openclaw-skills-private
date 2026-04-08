# Agent1：硕日系统发布 — 直观版（按顺序做）

> **根因（已核实）：** `scorecard` / `import/batches` / `import/channels/preview` 曾**只存在于 Cursor 工作区**，**未进入 Git**。历史提交 `c74e182` 的 `server.mjs` 里本来就没有这些路由，因此你在 **`033aeb9` 上 no-cache 重建**后容器内 `grep` 仍没有它们——**结论正确，不是网关或缓存问题**。  
> **现已在 open 仓库提交：** `b27fdfc`（分支 `feature/srne-channel-ops`）。请 **pull/合并到该提交或更新** 后再 `docker compose build --no-cache`，第一步 `grep` 应能在**宿主机** `collaboration/srne_channel_ops/api/server.mjs` 看到 `performance/scorecard`。

> **第三轮（v3）补充：** 业务方转发 **`FORWARD_OPENCLAW_AGENT1_RELEASE_v3.md`** 后，除 v2 能力外，代码须含 **`channel_360`**、竞品/活动路由及前端 **`ch360Mount`**。构建前用下方「v3 快速 grep」；OpenClaw 应先完成同步并给出 **Git SHA** 再构建。

> **第四轮（v4）补充：** 业务方转发 **`FORWARD_OPENCLAW_AGENT1_RELEASE_v4.md`** 后，在 v3 之上验收 **图表/列表下钻**、`overview.topChannels[].id`、`scorecard.watchlist[].channel_id`、**国别机会 TOP** 面板、**`AI_AGENT_ENABLEMENT.md`**。构建前执行下方「v4 快速 grep」。

> **第五轮（v5）补充：** 业务方转发 **`FORWARD_OPENCLAW_AGENT1_RELEASE_v5.md`** 后，在 v4 之上验收侧栏 **「价值量化 / ROI」**（**无新接口**）。构建前执行「v5 快速 grep」。**OpenClaw** 须先把含提交的代码同步到 Agent1 拉取的分支并给出 **SHA**（Cursor 参考：`92ab856` on `main`）。

---

## 这一单要你做什么？（一句话）

把仓库里的 **`collaboration/srne_channel_ops/` 整包** 更新到服务器上，**重新构建并重启**服务，让浏览器里的 **「绩效看板」** 和 **「数据导入」** 变成新版本（带图表、校验预览、导入批次记录）。**若执行 v3：** 另须看到渠道详情 **360° 三流**与市场情报增强（见第四步第 4 条）。**若执行 v4：** 另须验证 **下钻与国别机会 TOP**（见第四步第 5 条）。**若执行 v5：** 另须验证 **价值量化 / ROI**（见第四步第 6 条）。

---

## 为什么要重新发？

| 情况 | 结果 |
|------|------|
| 只更新了后端、没更新 `web/app.js` | 页面还是旧的，看不见新绩效/新导入流程 |
| 只更新了前端、没更新 `server.mjs` | 接口 404 或报错 |
| Docker 用错目录构建（只用 `api/` 当 context） | 镜像里**没有** `web/`、`data/`，启动异常或缺页 |

**所以：后端 + 前端静态 +（如有）种子，要一起随本次目录发布。**

---

## 第一步：确认你手里的代码对

在部署用仓库根目录执行：

```bash
test -f collaboration/srne_channel_ops/api/server.mjs && echo "OK server"
test -f collaboration/srne_channel_ops/web/app.js && echo "OK web"
grep -q performance/scorecard collaboration/srne_channel_ops/api/server.mjs && echo "OK 含 scorecard 接口"
```

**v3 快速 grep（第三轮发布时必过）：**

```bash
grep -q channel_360 collaboration/srne_channel_ops/api/server.mjs && echo "OK channel_360"
grep -qE '/v1/channels/.*/competitors' collaboration/srne_channel_ops/api/server.mjs && echo "OK competitors"
grep -q ch360Mount collaboration/srne_channel_ops/web/index.html && echo "OK ch360 前端挂载点"
```

**v4 快速 grep（第四轮发布时必过）：**

```bash
grep -q 'ch.id, ch.channel_code' collaboration/srne_channel_ops/api/server.mjs && echo "OK topChannels 含 id"
grep -q 'AS channel_id' collaboration/srne_channel_ops/api/server.mjs && echo "OK watchlist 含 channel_id"
grep -q jumpChannelsByRegion collaboration/srne_channel_ops/web/app.js && echo "OK 下钻"
grep -q dashIntelOppty collaboration/srne_channel_ops/web/index.html && echo "OK 国别机会 TOP"
test -f collaboration/srne_channel_ops/AI_AGENT_ENABLEMENT.md && echo "OK AI 文档"
```

**v5 快速 grep（第五轮 · 价值量化/ROI）：**

```bash
grep -q 'data-nav="valueRoi"' collaboration/srne_channel_ops/web/index.html && echo "OK ROI 侧栏"
grep -q computeVroiModel collaboration/srne_channel_ops/web/app.js && echo "OK ROI 逻辑"
test -f collaboration/srne_channel_ops/FORWARD_SRNE_AGENT_VALUE_ROI_HANDOFF.md && echo "OK ROI 交接文档"
```

若 `grep` 没有输出：**不要先 Docker**——说明当前 Git 工作区仍是旧快照（例如仅到 `c74e182` / `033aeb9`）。请先 **同步到含 `b27fdfc` 的提交**（或等价完整 `server.mjs`），再构建。  
**v3：** 须同步到 OpenClaw/业务方提供的 **含第三轮改动的 SHA**（见 `FORWARD_OPENCLAW_AGENT1_RELEASE_v3.md`）。  
**v4：** 须同步到 **含第四轮改动的 SHA**（见 `FORWARD_OPENCLAW_AGENT1_RELEASE_v4.md`）。  
**v5：** 须同步到 **含第五轮（ROI 页）的 SHA**（见 `FORWARD_OPENCLAW_AGENT1_RELEASE_v5.md`；至少 `92ab856`，建议拉至发布分支 **最新**）。

---

## 第二步：构建与启动（Docker 示例）

**必须在包含 `web/`、`data/` 的那一层当构建根目录：**

```bash
cd collaboration/srne_channel_ops
docker compose build --no-cache
docker compose up -d
```

（若你们不用 compose，等价于：以 **`collaboration/srne_channel_ops/`** 为 context 构建镜像，并设置好下面的环境变量。）

**环境变量（生产别忘了）：**

- `SRNE_DB_PATH`：SQLite 文件路径，且**挂卷持久化**（重启不能丢库）
- `JWT_SECRET`：**换成强随机**，不要用仓库默认值

---

## 第三步：公网地址怎么拼？（两种部署二选一）

你们线上若是 **`http://IP/srne/`** 这种子路径：

- 健康检查：`http://IP/srne/v1/health`
- 登录页：`http://IP/srne/`（或 `http://IP/srne/index.html`）

若是**根路径**部署（没有 `/srne`）：

- 健康检查：`http://域名或IP:端口/v1/health`

下面命令里把 **`BASE`** 换成你的前缀：**子路径用 `http://IP/srne`，根路径用 `http://IP:8790`**（不要多写末尾斜杠也可以，curl 注意路径）。

```bash
BASE="http://你的IP或域名/srne"   # 子路径示例；根路径则 BASE="http://IP:8790"

curl -sS "$BASE/v1/health"
# 应看到 JSON 里有 "ok": true

TOKEN=$(curl -sS -X POST "$BASE/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@srne.demo","password":"Demo2026!"}' | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')

curl -sS -H "Authorization: Bearer $TOKEN" "$BASE/v1/performance/scorecard" | head -c 400
# 应看到 JSON 里有 bsc、region_scorecard、watchlist 等字段（不是 404）

curl -sS -H "Authorization: Bearer $TOKEN" "$BASE/v1/import/batches"
# 应返回 200（可能是空数组 []）
```

---

## 第四步：浏览器里 3 个肉眼检查（管理员账号）

账号：`admin@srne.demo`  
密码：`Demo2026!`

1. 登录后进 **总览**：能看到图表（不是光秃秃数字）。
2. 打开 **绩效看板**：有多块内容（BSC、区域图、关注清单、负责人表等），**不是**一两行占位。
3. 打开 **数据导入**：能先 **预览/校验**，再 **确认写入**，下面有 **导入批次** 列表（或接口 `import/batches` 有数据）。
4. **（v3）渠道 360°：** 进入 **渠道商** → 打开任一渠道详情页，可见 **「信息流 / 业务流 / 资金流」** 三列及业绩洞察区块（非仅旧版业务上下文+图表）；建议 **强制刷新**（Cmd+Shift+R）避免缓存旧 `app.js`。
5. **（v4）下钻：** **总览** 有 **国别机会指数 TOP**，点击进情报；点击 **TOP 渠道** 横条进渠道详情；**绩效** 关注清单 **渠道详情**、区域表 **区域渠道**；**预警** 可进渠道详情；**渠道详情** 页眉有一行 **快捷链**。
6. **（v5）价值量化 / ROI：** 侧栏进入 **价值量化 / ROI**，调参数表与 KPI 联动；**复制摘要** 可用。

任意一步明显还是「空壳页」→ 说明静态 `web/` 没更新到当前访问的站点，或反代指错了目录/旧容器。

---

## 第五步：回传给业务方（复制填空）

```
部署 URL：________________（是否 HTTPS：____）
健康检查：GET ___/v1/health → 200 是 / 否
Git 提交或镜像 tag：________________
JWT_SECRET 已更换：是 / 否
浏览器三步（总览图 / 绩效多块 / 导入预览+批次）：通过 / 未通过
渠道 360°（v3）：通过 / 未通过 / 本轮不涉及
下钻与国别 TOP（v4）：通过 / 未通过 / 本轮不涉及
价值量化 / ROI（v5）：通过 / 未通过 / 本轮不涉及
```

### 业务方已回传记录（便于 Agent1 对账）

| 轮次 | Git 提交（你方部署仓库） | 已验证可用 | 仍为 404 / 说明 |
|------|-------------------------|------------|-----------------|
| 1 | `e5ba48d` | `/srne/`、`/srne/v1/health`、登录、`dashboard`、`performance/summary`、`import/channels`、持久化 | `performance/scorecard`、`import/batches` |
| 2 | `033aeb9` | 容器内 `grep`：仅有 `performance/summary`、`import/channels`、`import/channels/upload`；已 `down` + `build --no-cache` + `up --force-recreate`；网关复测同上 | `scorecard`、`batches` 仍 404 — **构建源 `server.mjs` 本身无这两段路由** |

---

## 给 Agent1 的说明（与上一轮纠偏的关系）

上一轮写「404 = 镜像没更新」在**真源已进 Git**的前提下成立。本轮实机证明：**你们当时拉取的 Git 里根本没有这两段路由**（与历史 `c74e182` 一致），no-cache 也只能打出「忠实于旧文件」的镜像——**你们判断正确**。

**当前对策：**

1. 在**宿主机**（构建前）执行：  
   `grep -n "performance/scorecard" collaboration/srne_channel_ops/api/server.mjs`  
   无输出 → **禁止**指望 Docker 自愈，必须先 **同步代码**。
2. open 仓库已提交含完整路由的版本：**`b27fdfc`**（`feature/srne-channel-ops`）。请 merge / cherry-pick / 由 OpenClaw 同步后再构建。
3. 同步后再做容器内 `grep`（应与宿主机一致），然后对外 curl。

**可选：不依赖 pull 时**，用 `git show b27fdfc:collaboration/srne_channel_ops/api/server.mjs` 对比你方文件是否出现 `app.get("/v1/performance/scorecard"`。

**容器内验证（同步代码并重建后）：**

```bash
docker exec CONTAINER grep -n "performance/scorecard" /app/api/server.mjs
docker exec CONTAINER grep -n "import/batches" /app/api/server.mjs
```

- **仍无输出**：构建 context 或 COPY 路径仍不对，或打的不是新镜像。
- **有输出** 但网关 404：再查反代路径、是否打到别服务。

**对外复测：**

```bash
BASE="http://<IP>/srne"
TOKEN=... # 同第三步登录
curl -sS -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" "$BASE/v1/performance/scorecard"
curl -sS -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" "$BASE/v1/import/batches"
# 期望 200，非 404
```

---

## 仍不通过时，优先查这 3 条

1. 浏览器 **强制刷新** 或清缓存（旧 `app.js` 常被缓存）。
2. 反代是否把 **`/srne/`** 转到**新容器**的 8790，且没有混用两个版本。
3. 构建 context 是否是 **`collaboration/srne_channel_ops/`**（不是单独 `api/`）。

---

## 和「长版发布说明」的关系

- **执行发布：以本文件为准**（步骤短、可勾选项多）。
- **第三轮转发：** **`FORWARD_OPENCLAW_AGENT1_RELEASE_v3.md`**
- **第四轮转发：** **`FORWARD_OPENCLAW_AGENT1_RELEASE_v4.md`**
- **第五轮转发 OpenClaw + Agent1：** **`FORWARD_OPENCLAW_AGENT1_RELEASE_v5.md`**
- 环境变量细则、安全红线、完整 API 列表：仍看 **`FORWARD_TO_AGENT1_CLOUD_DEPLOY.md`** 和 **`README.md`**。
- 历史完整功能列表： **`RELEASE_REQUEST_FOR_AGENT1.md`**。
