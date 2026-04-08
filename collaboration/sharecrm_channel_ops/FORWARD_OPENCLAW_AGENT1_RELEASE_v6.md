# 纷享销客 ShareCRM 渠道运营原型 · 第六轮发布（转发 OpenClaw + Agent1）

**文档用途：** 业务方将本文 **整段转发** 给 OpenClaw 与 Agent1。  
**发布代号：** ShareCRM **v6**（**品牌与路径迁移**：`srne` → `sharecrm`，目录 `sharecrm_channel_ops`；网关 **`/srne/` → `/sharecrm/`**；环境变量 **`SRNE_*` → `SHARECRM_*`**）  
**日期：** 以实际推送日为准

---

## 一、Cursor 研判摘要

| 项 | 结论 |
|----|------|
| **代码锚点（私库 main，以远程为准）** | 短 SHA **`53afae3`**（`rebrand: 硕日→纷享销客, srne→sharecrm; rename to sharecrm_channel_ops`） |
| **目录** | 使用 **`collaboration/sharecrm_channel_ops/`**；**不再**依赖已删除的 **`collaboration/srne_channel_ops/`** |
| **OpenClaw** | 将 **`main`**（或团队约定分支）同步到 Agent1 构建仓库；推送后 **`git rev-parse HEAD`** 发 **短 SHA**（可能与 `53afae3` 相同或为其后 merge 提交） |
| **Agent1** | **Docker build context = `collaboration/sharecrm_channel_ops/`**；Nginx/网关 **`/sharecrm/`** 反代到新容器；配置 **`SHARECRM_DB_PATH`**、**`SHARECRM_DEMO_MODE`**（及 **`JWT_SECRET`**） |
| **旧库复用** | 沿用原 SQLite 时： **`SHARECRM_DB_PATH`** 指向原 **`srne_channel.db`** 绝对路径（见 **`README.md`「自旧版升级」**） |

---

## 二、给 OpenClaw 的协作说明

1. **确认源：** 私库路径 **`collaboration/sharecrm_channel_ops/`**（整包）；**勿再引用 `srne_channel_ops`**。
2. **同步：** 将含 **`53afae3`** 的 **`main`**（或 **`feature/sharecrm-channel-ops`**，以团队约定为准）合并/推送到 Agent1 **`git pull`** 的仓库。
3. **记录 SHA：** 在 **实际构建分支** 执行 `git rev-parse HEAD`，把 **短 SHA** 发群（**以远程 HEAD 为准**，参考 **`53afae3`**）。
4. **通知 Agent1：** 「请按 **`FORWARD_OPENCLAW_AGENT1_RELEASE_v6.md`** + **`AGENT1_发布_直观清单.md`** 执行；代码 SHA ______」。
5. **阻塞时：** 按既有流程打 **`collaboration/cursor-out/sharecrm_channel_ops_*.tar.gz`**（若存在），并更新 **`cursor-out/AGENT1_SHARECRM_INGEST_AND_DEPLOY.md`**。

**OpenClaw 完成后请回传（可复制）：**

```
已推送分支：________________
Git SHA（构建用）：________________
Agent1 已 @ / 已发任务单：是 / 否
```

---

## 三、给 Agent1 的发布范围（v6 增量）

| 类别 | 内容 |
|------|------|
| **网关** | 对外前缀由 **`/srne/`** 改为 **`/sharecrm/`**，与前端 **`apiBase()`**（`web/app.js`）一致。 |
| **健康检查** | `GET …/sharecrm/v1/health` → `ok: true`，**`service`** 字段为 **`sharecrm-channel-ops`**（非 `srne`）。 |
| **环境变量** | **`SHARECRM_DB_PATH`**、**`SHARECRM_DEMO_MODE`** 替代原 **`SRNE_DB_PATH`**、**`SRNE_DEMO_MODE`**；Compose/容器名已对齐 **sharecrm**（见 `docker-compose.yml`）。 |
| **数据** | 复用旧库：将 **`SHARECRM_DB_PATH`** 指到原 **`srne_channel.db`** 的绝对路径（种子与迁移仍由进程启动时处理）。 |
| **登录验收** | **`admin@sharecrm.demo`** / **`Demo2026!`**（见 `README.md`、登录页预填）。 |

**累计能力（v2–v5）不变：** 仍以 **`RELEASE_REQUEST_FOR_AGENT1.md`** 与清单中 v2–v5 grep/浏览器项为准；**v6 在部署层完成路径与变量切换**。

---

## 四、构建前快速核对（v6）

```bash
test -d collaboration/sharecrm_channel_ops && echo OK_dir
! test -e collaboration/srne_channel_ops && echo OK_no_legacy_srne_dir || echo WARN_srne_still_present
grep -q 'sharecrm-channel-ops' collaboration/sharecrm_channel_ops/api/server.mjs && echo OK_health_service
grep -q "/sharecrm" collaboration/sharecrm_channel_ops/web/app.js && echo OK_apiBase_sharecrm
```

---

## 五、curl 最小验收（子路径部署）

```bash
BASE="http://<IP或域名>/sharecrm"
curl -sS "$BASE/v1/health"
# 期望 JSON： "ok":true 且 "service":"sharecrm-channel-ops"

curl -sS -X POST "$BASE/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@sharecrm.demo","password":"Demo2026!"}'
# 期望含 token
```

---

## 六、浏览器验收（管理员）

1. 打开 **`…/sharecrm/`**（或等价入口），**非** `/srne/`。  
2. 登录 **`admin@sharecrm.demo` / `Demo2026!`**，总览与侧栏正常。  
3. **硬刷新** 后仍正常（避免旧 **`srne` 静态** 缓存）。  
4. （可选）抽验 v5：**价值量化 / ROI** 侧栏仍可用。

---

## 七、回传模板（Agent1）

```
部署 URL（/sharecrm/）：________________
GET …/sharecrm/v1/health → service 字段：________________
Git SHA：________________
SHARECRM_DB_PATH：________________（是否指向旧 srne_channel.db：是/否/新库）
网关已从 /srne/ 切到 /sharecrm/：是 / 否
浏览器登录与总览：通过 / 未通过
```

---

## 八、参考

- 短清单：**`AGENT1_发布_直观清单.md`**（已含 v6 文首说明时，与本文一起执行）  
- 累计验收：**`RELEASE_REQUEST_FOR_AGENT1.md`**（文档版本 v6）  
- 云部署细则：**`FORWARD_TO_AGENT1_CLOUD_DEPLOY.md`**、**`README.md`**

---

**文档版本：** v6 · 路径/品牌/环境变量迁移（OpenClaw + Agent1）
