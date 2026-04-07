# Agent1：硕日系统发布 — 直观版（按顺序做）

## 这一单要你做什么？（一句话）

把仓库里的 **`collaboration/srne_channel_ops/` 整包** 更新到服务器上，**重新构建并重启**服务，让浏览器里的 **「绩效看板」** 和 **「数据导入」** 变成新版本（带图表、校验预览、导入批次记录）。

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

若 `grep` 没有输出，说明代码还是旧的，需要先 **pull / 解压 tar** 拿到最新 `srne_channel_ops`。

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

任意一步明显还是「空壳页」→ 说明静态 `web/` 没更新到当前访问的站点，或反代指错了目录/旧容器。

---

## 第五步：回传给业务方（复制填空）

```
部署 URL：________________（是否 HTTPS：____）
健康检查：GET ___/v1/health → 200 是 / 否
Git 提交或镜像 tag：________________
JWT_SECRET 已更换：是 / 否
浏览器三步（总览图 / 绩效多块 / 导入预览+批次）：通过 / 未通过
```

### 业务方已回传记录（便于 Agent1 对账）

| 项 | 结果 |
|----|------|
| **Git 提交** | `e5ba48d`（以你方部署仓库为准） |
| **已验证可用** | `/srne/`、`/srne/v1/health`、登录、`dashboard`、`performance/summary`、`import/channels`、重启后持久化 |
| **仍为 404** | `GET /v1/performance/scorecard`、`GET /v1/import/batches` |

---

## 给 Agent1 的纠偏（404 ≠ 功能未做）

业务侧曾判断「代码里还没这两个路由」——**在 Cursor 维护的源码树里，这两条路已经存在**，与 `performance/summary`、`import/channels` 同属 `server.mjs`。若公网 404，说明 **当前对外提供流量的进程里加载的 `server.mjs` 仍是旧文件**（镜像未重建、指错容器、或构建时用的不是含以下内容的目录）。

**在本仓库中可核对（路径相对仓库根）：**

- `app.get("/v1/performance/scorecard", …)` — 见 `collaboration/srne_channel_ops/api/server.mjs`
- `app.get("/v1/import/batches", …)` — 同上
- 同一文件内还有：`POST /v1/import/channels/preview`（若 scorecard 404，preview 往往也 404）

**请在「实际跑 8790 的容器」里验证（避免只看宿主机 git）：**

```bash
# 将 CONTAINER 换成你们 srne 容器名或 ID
docker exec CONTAINER grep -n "performance/scorecard" /app/api/server.mjs
docker exec CONTAINER grep -n "import/batches" /app/api/server.mjs
```

- **有输出**：路由在镜像里，却仍 404 → 查网关是否把 `/srne/v1/performance` 错配到别的服务，或路径被 strip。
- **无输出**：镜像仍是旧代码 → 在 **`collaboration/srne_channel_ops/`** 下 **`docker compose build --no-cache`** 再 `up -d`，并确认负载均衡只指向新容器。

**合并后对外再验（与管理台同 BASE）：**

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
- 环境变量细则、安全红线、完整 API 列表：仍看 **`FORWARD_TO_AGENT1_CLOUD_DEPLOY.md`** 和 **`README.md`**。
- 历史完整功能列表： **`RELEASE_REQUEST_FOR_AGENT1.md`**。
