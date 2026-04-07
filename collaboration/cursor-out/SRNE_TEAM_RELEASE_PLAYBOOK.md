# 硕日 SRNE · 第三轮发布团队协作单（OpenClaw / 小江 → Agent1）

**用途：** 业务方一键转发；**先同步、后部署**，与此前两轮相同——**仍需 OpenClaw / 小江做文件与 Git 对齐**，再由 **Agent1** 构建上线。  
**本轮增量：** 「业务作战台」、渠道 **业务上下文**、预警 **库龄 SLA**、负责人榜 **未分配** 等（提交 **`4987b0a`** 起）。

---

## 一、推荐协作顺序（谁先做）

```text
OpenClaw / 小江：把 open 仓库 feature/srne-channel-ops 的 srne 树同步到「部署用私库」并 push
        ↓
   （宿主机四条 grep 全 OK）
        ↓
Agent1：拉取私库 → docker compose build --no-cache → up → 对外验收
        ↓
   回传 URL + HTTP 码 + Git tip SHA
```

**不要颠倒：** Agent1 在私库未含新 `server.mjs` 前构建，只会再次打出旧镜像。

---

## 二、给 OpenClaw / 小江（文件协助）

### 2.1 请你完成

1. 以 **open 仓库** 为准，将下列内容同步到 **Agent1 实际 `pull` 的 Git 仓库**（如 `openclaw-skills-private` 或与线上一致的私库），并 **push** 到约定分支（`main` / `master` / 团队约定名）。
2. **建议对齐分支 tip：** `feature/srne-channel-ops` **当前 HEAD**（须含本文件 `SRNE_TEAM_RELEASE_PLAYBOOK.md` 与提交 **`4987b0a`** 起的 `server.mjs` / `web` 变更）。
3. 同步范围（相对仓库根）至少包含：
   - `collaboration/srne_channel_ops/api/server.mjs`
   - `collaboration/srne_channel_ops/web/`（`index.html`、`app.js`、`styles.css`）
   - `collaboration/srne_channel_ops/README.md`（可选但建议）
   - `collaboration/srne_channel_ops/AGENT1_任务单_仅部署.md`（已含 `scenarios/playbook` 自检）

### 2.2 同步完成后，在「将要交给 Agent1 构建的那份仓库」里自检

```bash
grep -q 'performance/scorecard' collaboration/srne_channel_ops/api/server.mjs && echo OK_scorecard || echo FAIL
grep -q 'import/batches' collaboration/srne_channel_ops/api/server.mjs && echo OK_batches || echo FAIL
grep -q 'import/channels/preview' collaboration/srne_channel_ops/api/server.mjs && echo OK_preview || echo FAIL
grep -q 'scenarios/playbook' collaboration/srne_channel_ops/api/server.mjs && echo OK_playbook || echo FAIL
```

**四行均为 `OK_*`** 再通知 Agent1 开工。任一为 `FAIL` → 说明合并/拷贝未带上新提交，请补同步后再交接。

### 2.3 请你回传（给业务方 / Agent1）

```
私库仓库名：________________
已推送分支：________________
tip 提交 SHA：________________
四条 grep：全 OK / 有 FAIL（哪条：____）
已 @ Agent1 或可构建时间：________________
```

**安全提醒（小江把关）：** 仍须 **HTTPS**、**强随机 JWT_SECRET**、SQLite **持久化卷**；勿将演示密码写入对外长期文档。

---

## 三、给 Agent1（发布指令）

### 3.1 前置条件

- 已收到 OpenClaw / 小江通知：**私库四条 grep 全 OK**。
- 本地或 CI `git pull` 后，在**同一工作区**再跑一遍上述四条 grep 复核。

### 3.2 构建与启动（与此前一致）

详细命令见：**`collaboration/srne_channel_ops/AGENT1_任务单_仅部署.md`**（第 2～3 步）。

要点复述：

- **构建 context** 必须是 **`collaboration/srne_channel_ops/`**（勿仅用 `api/`）。
- 建议：`docker compose down` → `build --no-cache` → `up -d --force-recreate`。

### 3.3 本轮新增验收（在以往 health / scorecard / batches 之外）

将 **`BASE`** 换成公网实际前缀（子路径示例 `http://IP/srne`）：

```bash
TOKEN=$(curl -sS -X POST "$BASE/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@srne.demo","password":"Demo2026!"}' \
  | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')

curl -sS -o /dev/null -w "playbook %{http_code}\n" -H "Authorization: Bearer $TOKEN" "$BASE/v1/scenarios/playbook"

curl -sS -H "Authorization: Bearer $TOKEN" "$BASE/v1/channels/1" | head -c 300
# 响应 JSON 中应含 "business_context"
```

**期望：** `playbook` 为 **200**；`channels/1`（或任意可见渠道 id）含 **`business_context`** 字段。

### 3.4 浏览器抽检

1. 侧栏进入 **「业务作战台」**：可见目标脉搏、SLA 桶、优先动作表，且「打开渠道」可跳转。  
2. 任意渠道 **详情**：有 **「业务上下文」** 面板，且可跳转 **市场情报**。  
3. **预警中心**：列表含 **库龄** 列（彩色药丸）。  
4. **绩效看板 · 负责人战报**：若有无负责人渠道，应出现 **「未分配」** 行（视种子数据而定）。

### 3.5 Agent1 回传模板

```
公网 BASE：________________
构建用私库 tip SHA：________________
HTTP：playbook ____  scorecard ____  batches ____
浏览器：作战台 / 渠道上下文 / 预警库龄 / 负责人表 — 通过或说明：________________
```

---

## 四、真源与历史文档

| 文档 | 作用 |
|------|------|
| 本文 **`SRNE_TEAM_RELEASE_PLAYBOOK.md`** | 本轮 **团队协作主单**（OpenClaw/小江 + Agent1） |
| `OPENCLAW_REQUEST_SRNE_SYNC_AND_DEPLOY.md` | 首轮 OpenClaw 同步诉求（含 `b27fdfc` 背景），仍可作流程参考 |
| `AGENT1_任务单_仅部署.md` | Agent1 **逐步命令** + 四条 grep |
| `AGENT1_发布_直观清单.md` | 更长排障与业务方回传记录 |
| `FORWARD_TO_AGENT1_CLOUD_DEPLOY.md` | 环境变量与安全红线 |

---

**文档版本：** v1 · 第三轮（playbook / business_context / SLA / 未分配负责人）  
**维护：** Cursor · `feature/srne-channel-ops`

---

## 五、业务方可直接复制转发（三段）

**发给 OpenClaw / 小江：**

```text
请按 collaboration/cursor-out/SRNE_TEAM_RELEASE_PLAYBOOK.md 第二节执行：
把 open 仓库 feature/srne-channel-ops 当前 HEAD（须含 4987b0a 与 SRNE_TEAM_RELEASE_PLAYBOOK.md）下的 collaboration/srne_channel_ops/ 与本文档同步到部署私库并 push；
宿主机跑文档里四条 grep，全 OK 后把 tip SHA 和结果回给我，并通知 Agent1 可构建。
```

**发给 Agent1：**

```text
请等私库同步完成（四条 grep 已 OK）后，按 collaboration/srne_channel_ops/AGENT1_任务单_仅部署.md 构建部署；
并额外验收 SRNE_TEAM_RELEASE_PLAYBOOK.md 第三节：GET /v1/scenarios/playbook 200、渠道详情含 business_context、浏览器作战台与预警库龄。回传该文档里的 Agent1 回传模板。
```

**发群 / 汇总一条：**

```text
硕日 SRNE 第三轮发布协作：先 OpenClaw/小江同步 open→私库（见 SRNE_TEAM_RELEASE_PLAYBOOK.md §2），再 Agent1 按任务单 + §3 验收；真源分支 feature/srne-channel-ops。
```
