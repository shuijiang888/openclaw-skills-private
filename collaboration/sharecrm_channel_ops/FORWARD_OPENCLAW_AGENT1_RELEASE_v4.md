# 纷享销客渠道运营原型 · 第四轮发布（转发 OpenClaw + Agent1）

**文档用途：** 业务方将本文 **整段转发** 给 OpenClaw 与 Agent1；OpenClaw 负责 **代码同步与触发部署**，Agent1 负责 **拉取、构建、上线与验收回传**。  
**发布代号：** ShareCRM v4（对象下钻 + 接口主键补强 + AI 赋能说明文档）  
**日期：** 2026-04-08（以实际推送日为准）

---

## 一、给 OpenClaw 的协作说明（请先执行）

1. **确认源：** Cursor 侧交付在仓库路径 `collaboration/sharecrm_channel_ops/`（本轮涉及 **`api/server.mjs`**、**`web/index.html`**、**`web/app.js`**、**`web/styles.css`**、**`README.md`**、**`AI_AGENT_ENABLEMENT.md`**）。
2. **同步到部署用仓库：** 将含本轮改动的提交 **合并/推送** 到 Agent1 实际 `pull` 的分支（建议：`feature/sharecrm-channel-ops` 或团队约定主分支）。
3. **记录 SHA：** 推送后记下 **`git rev-parse HEAD`**（短 SHA），写入下方「版本锚点」或回传群。
4. **通知 Agent1：** 「请按 **`FORWARD_OPENCLAW_AGENT1_RELEASE_v4.md`** + **`AGENT1_发布_直观清单.md`** 执行发布；代码已更新到 SHA ______」（v3 及以前能力仍包含在内，本单在 v3 之上验收 **下钻与 v4 grep**）。
5. **阻塞时：** 若私库与 open 不同步，按既有流程打 **`collaboration/cursor-out/sharecrm_channel_ops_*.tar.gz`**（或更新包），并同步 **`cursor-out/AGENT1_SHARECRM_INGEST_AND_DEPLOY.md`** 中的文件名与校验说明。

**OpenClaw 完成后请回传（可复制）：**

```
已推送分支：________________
Git SHA：________________
Agent1 已 @ / 已发任务单：是 / 否
```

---

## 二、给 Agent1 的发布范围（第四轮增量）

在 **v3（情报 v2 + 渠道 360°）** 基础上，本轮主要包括：

| 类别 | 内容 |
|------|------|
| **API** | `GET /v1/analytics/overview` 的 **`topChannels`** 每项增加 **`id`**（渠道主键），供前端从 TOP 图下钻详情。 |
| **API** | `GET /v1/performance/scorecard` 的 **`watchlist`** 每项增加 **`channel_id`**，供关注清单「渠道详情」按钮使用。 |
| **前端 · 总览** | 区域柱图 / A·B·C 环形图 / TOP 渠道横条 **点击下钻**；新增 **国别机会指数 TOP**（`intelOpportunity`）点击进情报；下钻说明文案。 |
| **前端 · 作战台** | 覆盖缺口卡片：**打开渠道列表**、**打开情报国别表**。 |
| **前端 · 预警** | 渠道编码链接 + **渠道详情** 按钮（依赖 `alert.channel_id`）。 |
| **前端 · 绩效** | 区域表明细 **「区域渠道」**；关注清单 **「渠道详情」**。 |
| **前端 · 渠道详情** | 页眉 **快捷链**：情报、该国渠道、本区域渠道、报价、作战台、预警中心。 |
| **文档** | **`AI_AGENT_ENABLEMENT.md`**（AI Agent 按角色/场景赋能与边界）；**`README.md`** 增加指向该文档的链接。 |

**数据库：** 无新增表、无手工迁移步骤；与 v3 相同，**重启新版本进程即可**。

**须一并发布的制品：** 仍为 **`collaboration/sharecrm_channel_ops/`** 整包；Docker **build context = 该目录**。

---

## 三、Agent1 执行步骤（摘要）

详细命令仍以 **`AGENT1_发布_直观清单.md`** 为准。构建前在宿主机建议执行 **v4 快速 grep**（该文件已收录）；至少应满足：

```bash
grep -q 'ch.id, ch.channel_code' collaboration/sharecrm_channel_ops/api/server.mjs && echo "OK topChannels 含 id"
grep -q 'AS channel_id' collaboration/sharecrm_channel_ops/api/server.mjs && echo "OK watchlist 含 channel_id"
grep -q 'jumpChannelsByRegion' collaboration/sharecrm_channel_ops/web/app.js && echo "OK 下钻逻辑"
grep -q 'dashIntelOppty' collaboration/sharecrm_channel_ops/web/index.html && echo "OK 国别机会面板"
test -f collaboration/sharecrm_channel_ops/AI_AGENT_ENABLEMENT.md && echo "OK AI 赋能文档"
```

然后：`docker compose build --no-cache` → `up -d`（或等价流程）。

---

## 四、验收清单（请 Agent1 回传）

**接口**

1. `GET $BASE/v1/analytics/overview`（Bearer）：`topChannels[0]` 含 **`id`** 字段（数字）。
2. `GET $BASE/v1/performance/scorecard`（Bearer）：`watchlist` 中若有数据，项含 **`channel_id`**。

**浏览器（管理员，建议硬刷新）**

3. **总览：** 出现 **「国别机会指数 TOP」**；点击某国进入情报详情。  
4. **总览：** 点击 **TOP 渠道** 横条某一柱 → 进入对应 **渠道详情**。  
5. **绩效：** 关注清单末列 **「渠道详情」** 可打开渠道；区域表 **「区域渠道」** 跳转列表并带区域筛选。  
6. **预警中心：** 渠道编码或 **「渠道详情」** 可打开渠道。  
7. **渠道详情** 页眉有一行 **快捷链**（情报 / 该国渠道 / 本区域 / 等）。

**运维**

8. 回传 **部署 URL**、**Git SHA 或镜像 tag**、**JWT_SECRET 是否已换**。

---

## 五、参考文档

| 文件 | 说明 |
|------|------|
| `AGENT1_发布_直观清单.md` | 构建、curl、浏览器（含 v3/v4 勾选项） |
| `RELEASE_REQUEST_FOR_AGENT1.md` | 累计功能与完整验收长版（v4） |
| `FORWARD_OPENCLAW_AGENT1_RELEASE_v3.md` | 第三轮说明（情报 + 360°） |
| `README.md` · `AI_AGENT_ENABLEMENT.md` | 使用说明与 AI 赋能叙事 |

---

## 六、版本锚点（推送后填写）

```
主仓 Git SHA：________________
部署 URL：________________
```

---

**文档版本：** v4 · 下钻交互 + overview/scorecard 字段补强 + AI 赋能文档
