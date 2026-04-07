# Agent1 闭环单 · 硕日渠道运营原型（无需业务方手工 git）

## 状态

| 项 | 值 |
|----|-----|
| **Cursor 侧本地提交 SHA** | `c74e182ea80ea2270a81151c6de1c63917e61154` |
| **分支** | `master`（当前工作区；若你方仓库主分支为 `main`，合并后以你方为准） |
| **源码树路径** | `collaboration/srne_channel_ops/` |
| **离线同源包** | 本目录下 `srne_channel_ops_c74e182.tar.gz`（与上述 SHA 的 `git archive` 一致） |

> 说明：Cursor 工作区 **未配置 `git remote`**，无法代推 `shuijiang888/openclaw-skills-private`。请你方用 **下面任一方式** 将目录落入你用于部署的仓库后，继续既有 4 项交付（Docker、安全基线、门户卡片、回传）。

---

## 方式 A（优先）：从你方已同步的 open 仓库拉取

若 OpenClaw / 同步任务会把本仓库推到与你共用的 remote：

```bash
git fetch origin
git checkout <含该提交的分支>
# 确认存在：
test -f collaboration/srne_channel_ops/api/server.mjs && echo OK
```

---

## 方式 B：用 tar 包零操作解压进目标仓库根目录

在 **`openclaw-skills-private`（或实际部署 repo）根目录**执行：

```bash
tar -xzf collaboration/cursor-out/srne_channel_ops_c74e182.tar.gz
# 应得到 collaboration/srne_channel_ops/ 下全部文件
```

若 tar 仅存在于 Cursor 机器：请让 **OpenClaw 或同步管道** 把 `collaboration/cursor-out/srne_channel_ops_c74e182.tar.gz` 拷入你方仓库同路径后再执行上述解压（或解压后 `git add collaboration/srne_channel_ops`）。

---

## 方式 C：`git cherry-pick`（若两仓库有共同祖先且能 fetch 到 c74e182）

```bash
git fetch <cursor-remote> c74e182ea80ea2270a81151c6de1c63917e61154
git cherry-pick c74e182ea80ea2270a81151c6de1c63917e61154
```

---

## 部署与验收（复述，与 FORWARD_TO_AGENT1_CLOUD_DEPLOY.md 一致）

1. **Build context** = `collaboration/srne_channel_ops/`（勿仅用 `api/`）。  
2. **环境**：`SRNE_DB_PATH` + 持久化卷；**强随机** `JWT_SECRET`；**HTTPS**。  
3. **门户**：首页增加「硕日能源系统」入口 → 指向部署后的 HTTPS 根路径。  
4. **回传**：HTTPS URL、`GET /v1/health`、JWT 是否已替换、Git SHA 或镜像 tag。

详细 API、账号、导入格式：`collaboration/srne_channel_ops/README.md`  
详细协同单：`collaboration/srne_channel_ops/FORWARD_TO_AGENT1_CLOUD_DEPLOY.md`

---

## OpenClaw（若由你负责同步）

请将 **提交 `c74e182`** 或 **`srne_channel_ops_c74e182.tar.gz`** 落入 `shuijiang888/openclaw-skills-private`，以便 Agent1 `pull` 后部署。业务方无需自行 `git push`。

---

**版本：** v1 · Cursor 代提交 + 离线包闭环
