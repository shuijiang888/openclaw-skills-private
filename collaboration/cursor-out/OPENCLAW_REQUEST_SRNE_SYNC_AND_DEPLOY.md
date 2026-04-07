# 给 OpenClaw 的协同诉求 · 硕日 `srne_channel_ops` 同步提交 + 安排 Agent1 部署

**致：** OpenClaw（任务编排 / 私库同步）  
**来自：** Cursor（`openclaw-cursor-playground`）  
**日期：** 2026-04-08（以业务方转发日为准）

> **第三轮及以后（含「业务作战台」`scenarios/playbook` 等）：** 请业务方优先转发 **`SRNE_TEAM_RELEASE_PLAYBOOK.md`** — 该文件把 **OpenClaw/小江** 与 **Agent1** 写在同一张协作单里。本文档仍可作为第二轮（`b27fdfc`）背景参考。

---

## 一、请你做什么（两件事，按顺序）

1. **文件与 Git 同步**：把本仓库 **`feature/srne-channel-ops`** 上、与硕日原型相关的提交，落到 **Agent1 实际部署用的 Git 仓库**（例如 `shuijiang888/openclaw-skills-private` 或与线上一致的私库），并 **push 到 Agent1 可 `pull` 的分支**（`main` / `master` / 约定分支）。
2. **安排 Agent1 部署更新**：在同步完成后，让 Agent1 按 **`collaboration/srne_channel_ops/AGENT1_发布_直观清单.md`** 从第一步做到对外复测，并回传验收结果。

---

## 二、背景（为什么需要你介入）

- 硕日 **`performance/scorecard`、`import/batches`、`import/channels/preview`** 等能力已在 Cursor 侧实现，但曾**长期只在工作区、未进入可被 Agent1 拉取的提交**，导致线上 **`033aeb9` 一类提交**里 `server.mjs` 仍无上述路由；Agent1 **no-cache 重建**也无法凭空生成接口。
- 该问题已在 open 仓库 **通过 Git 提交闭合**（见下文 SHA）。**缺的是：私库 / 部署源与 open 仓库对齐。**

---

## 三、Open 仓库真源（请同步到目标库）

| 项 | 值 |
|----|-----|
| **仓库** | `openclaw-cursor-playground`（或业务方等价 open 远端） |
| **分支** | `feature/srne-channel-ops` |
| **建议对齐 tip** | 至少 **`94b44be`**（含 `b27fdfc` 功能 + 清单 + `STATUS`）；并建议 **`feature/srne-channel-ops` 当前 tip**（含 `cursor-out/OPENCLAW_REQUEST_SRNE_SYNC_AND_DEPLOY.md` 本文件） |
| **功能提交（最小不可再拆）** | **`b27fdfc`** — `feat(srne): performance scorecard API, import preview/batches, import_batch table, web panels` |
| **其后文档提交** | `eba5bdc`（清单与 `033aeb9` 结论对齐）、`94b44be`（协作状态） |

**须进入目标库的目录（相对仓库根）：**

- `collaboration/srne_channel_ops/api/server.mjs`（**必含** `performance/scorecard`、`import/batches`、`import/channels/preview`）
- `collaboration/srne_channel_ops/web/`（`index.html`、`app.js`、`styles.css`）
- `collaboration/srne_channel_ops/data/seed.json`
- `collaboration/srne_channel_ops/README.md`（可选但建议）
- `collaboration/srne_channel_ops/AGENT1_发布_直观清单.md`、`RELEASE_REQUEST_FOR_AGENT1.md`（Agent1 执行说明）
- `collaboration/STATUS.md`（可选，便于对账）

**同步方式（任选，按你方管道惯例）：**

- `git fetch` + **merge / cherry-pick `b27fdfc..94b44be`** 到目标分支；或  
- 从 open 仓库 **生成 tar / patch** 覆盖 `collaboration/srne_channel_ops/` 与上述 `STATUS`，再 **commit + push**。

---

## 四、同步完成后的自检（请你或 CI 执行一次）

在 **目标仓库工作区**（非仅 Cursor 本机）执行：

```bash
grep -q 'performance/scorecard' collaboration/srne_channel_ops/api/server.mjs && echo OK_scorecard
grep -q 'import/batches' collaboration/srne_channel_ops/api/server.mjs && echo OK_batches
grep -q 'import/channels/preview' collaboration/srne_channel_ops/api/server.mjs && echo OK_preview
```

三行均有 `OK_*` 再交给 Agent1 构建。

---

## 五、请转给 Agent1 的执行要点（同步后）

- **唯一执行文档：** `collaboration/srne_channel_ops/AGENT1_发布_直观清单.md`（文首已写根因与 **`b27fdfc`** 要求）。
- **构建 context：** `collaboration/srne_channel_ops/`（勿仅用 `api/`）。
- **验收：** `GET …/v1/performance/scorecard` 与 `GET …/v1/import/batches` 在 **Bearer** 下 **200**；浏览器绩效看板与导入工作台非空壳。

详细环境变量与安全线仍见：`collaboration/srne_channel_ops/FORWARD_TO_AGENT1_CLOUD_DEPLOY.md`。

---

## 六、请你回传给业务方 / Cursor 的字段

```
目标仓库：________________
已推送分支：________________
 tip 提交 SHA：________________（应含 b27fdfc 或等价树）
自检 grep 三行：通过 / 未通过
已通知 Agent1 部署：是 / 否
Agent1 回传 URL + scorecard/batches HTTP 码：________________
```

---

## 七、与旧 ingest 文档的关系

`collaboration/cursor-out/AGENT1_SRNE_INGEST_AND_DEPLOY.md` 中的 **SHA `c74e182`** 仅代表**早期**原型，**不包含** `scorecard` / `batches`。请以本文 **`b27fdfc` / `94b44be`** 为准做同步与验收。

---

**文档版本：** v1 · Cursor 代拟 OpenClaw 协同单
