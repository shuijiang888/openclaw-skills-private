# Agent1 任务单 · 硕日 `srne` 部署更新（仅此一份即可执行）

**给你：** Agent1（部署 / 运维）  
**前提：** OpenClaw（或业务方）已把 **含 `b27fdfc` 等价改动的代码** 推进你方用于构建的 Git 仓库；若未同步，请先不要构建，向 OpenClaw 要 **`feature/srne-channel-ops`** 对齐后的提交。

---

## 你要做的事（4 步）

### 1. 构建前自检（在「将要 docker build 的那份仓库」里执行）

```bash
grep -q 'performance/scorecard' collaboration/srne_channel_ops/api/server.mjs && echo OK_scorecard || echo FAIL
grep -q 'import/batches' collaboration/srne_channel_ops/api/server.mjs && echo OK_batches || echo FAIL
grep -q 'import/channels/preview' collaboration/srne_channel_ops/api/server.mjs && echo OK_preview || echo FAIL
grep -q 'scenarios/playbook' collaboration/srne_channel_ops/api/server.mjs && echo OK_playbook || echo FAIL
grep -q 'value-map-html' collaboration/srne_channel_ops/api/server.mjs && echo OK_value_map || echo FAIL
```

五行都打印 `OK_*` 才继续做第 2 步。若出现 `FAIL`，说明拉到的仍是旧 `server.mjs`，**重建多少次都不会出现新接口**。

### 2. 构建与启动

```bash
cd collaboration/srne_channel_ops
docker compose down
docker compose build --no-cache
docker compose up -d --force-recreate
```

**必须**以 **`collaboration/srne_channel_ops/`** 为构建根目录（与现 Dockerfile 一致），不要用单独的 `api/` 当 context。

### 3. 容器内确认（可选但推荐）

```bash
docker exec <你的 srne 容器名或 ID> grep -n performance/scorecard /app/api/server.mjs
```

有输出即镜像内文件正确。

### 4. 对外验收（子路径部署时把 `BASE` 换成你们真实地址）

```bash
BASE="http://<IP或域名>/srne"
curl -sS "$BASE/v1/health" | head -c 200

TOKEN=$(curl -sS -X POST "$BASE/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@srne.demo","password":"Demo2026!"}' \
  | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')

curl -sS -o /dev/null -w "scorecard HTTP %{http_code}\n" -H "Authorization: Bearer $TOKEN" "$BASE/v1/performance/scorecard"
curl -sS -o /dev/null -w "batches HTTP %{http_code}\n" -H "Authorization: Bearer $TOKEN" "$BASE/v1/import/batches"
```

**期望：** `scorecard` 与 `batches` 均为 **200**（不是 404）。

浏览器：管理员登录后打开 **绩效看板**、**数据导入**，应有多块内容与预览/批次，而非空壳。

---

## 回传（请填好发给业务方）

```
公网 BASE（示例 http://IP/srne）：________________
构建用 Git 分支 + tip SHA：________________
第 1 步五 grep：全 OK / 有 FAIL
scorecard HTTP 码：____   batches HTTP 码：____
JWT_SECRET 是否已换生产随机值：是 / 否
```

---

## 更细的步骤与排障

若需命令级展开、网关说明、环境变量与安全线：同目录 **`AGENT1_发布_直观清单.md`**、**`FORWARD_TO_AGENT1_CLOUD_DEPLOY.md`**。

---

**版本：** v1 · 仅 Agent1 部署任务
