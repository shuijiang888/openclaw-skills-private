# 纷享销客渠道运营原型 · 第五轮发布（转发 OpenClaw + Agent1）

**文档用途：** 业务方将本文 **整段转发** 给 OpenClaw 与 Agent1。  
**发布代号：** ShareCRM **v5**（**价值量化 / ROI** 纯前端页 + 交接文档；**无新 HTTP 接口**）  
**日期：** 以实际推送日为准

---

## Cursor 研判摘要（给业务方）

| 项 | 结论 |
|----|------|
| **是否需 OpenClaw？** | **需要。** 须把含本轮的提交同步到 **Agent1 实际拉取的分支**（常为 `feature/sharecrm-channel-ops`；若已改为主干 `main` 则按约定），并 **记录 SHA、@ Agent1**。 |
| **Agent1 工作量** | **需重新构建并部署**（`web/*` 变更）；**无 `server.mjs` 强制变更**，但若镜像为整包构建，仍应按 **`AGENT1_发布_直观清单.md`** 全量构建，避免旧静态残留。 |
| **风险点** | 仅更新后端不更新静态 → **看不到**侧栏「价值量化 / ROI」；浏览器 **强刷** 或禁用缓存验证。 |

---

## 一、给 OpenClaw 的协作说明（请先执行）

1. **确认源提交：** ROI 页实现在 **`92ab856`**；**v5 转发本文 + 清单更新** 为同分支上的后续提交（与 `92ab856` 一并推送后，**以远程 `git rev-parse HEAD` 为准**）。Agent1 至少需包含 **`92ab856`**，建议 **pull 到发布分支最新**。若部署分支不是 `main`，请 **merge / cherry-pick** 到约定分支后再推送。
2. **推送部署用远程：** 确保 Agent1 `git pull` 能拿到 **含 v5** 的 `collaboration/sharecrm_channel_ops/web/*`、`README.md`、`FORWARD_SHARECRM_AGENT_VALUE_ROI_HANDOFF.md` 等。
3. **记录 SHA：** 推送后在**实际构建分支**上执行 `git rev-parse HEAD`，把 **短 SHA** 发群（可能与 `92ab856` 相同，也可能为 merge 产生的新 SHA）。
4. **通知 Agent1：** 「请按 **`FORWARD_OPENCLAW_AGENT1_RELEASE_v5.md`** + **`AGENT1_发布_直观清单.md`** 做 Docker 构建与上线验收；代码已在分支 ______，SHA ______」。
5. **详细交接（公式/预填/验收）：** 另见 **`FORWARD_SHARECRM_AGENT_VALUE_ROI_HANDOFF.md`**（可与本转发一并丢给售前/发布侧备查）。

**OpenClaw 完成后请回传（可复制）：**

```
已推送分支：________________
Git SHA（构建用）：________________
Agent1 已 @ / 已发任务单：是 / 否
```

---

## 二、给 Agent1 的发布范围（第五轮增量）

| 类别 | 内容 |
|------|------|
| **接口** | **无新增、无变更要求**（纯静态能力）。 |
| **前端** | 侧栏 **「价值量化 / ROI」**；`data-view="valueRoi"`；工时/节省/年费/风险等参数 → KPI 与对比表；**恢复默认**、**localStorage**、**复制 Markdown**；样式 `.vroi-*`。 |
| **文档** | `FORWARD_SHARECRM_AGENT_VALUE_ROI_HANDOFF.md`（交接与公式）；`README.md` 能力表一行。 |

**制品路径：** `collaboration/sharecrm_channel_ops/` 整包；Docker **build context = 该目录**（与 v2–v4 一致）。

---

## 三、构建前快速 grep（v5）

```bash
grep -q 'data-nav="valueRoi"' collaboration/sharecrm_channel_ops/web/index.html && echo "OK ROI 侧栏"
grep -q 'computeVroiModel' collaboration/sharecrm_channel_ops/web/app.js && echo "OK ROI 逻辑"
test -f collaboration/sharecrm_channel_ops/FORWARD_SHARECRM_AGENT_VALUE_ROI_HANDOFF.md && echo "OK ROI 交接文档"
```

（v2–v4 的 grep 仍建议保留执行，确保整包非旧快照。）

---

## 四、浏览器验收（管理员登录后）

1. 侧栏存在 **「价值量化 / ROI」**，进入后无控制台致命错误。  
2. 拖动 **节省比例** 滑块、改 **系统年费**，KPI 与表格 **即时变化**。  
3. **复制摘要（Markdown）** 有成功提示或降级复制。  
4. **硬刷新**（Cmd+Shift+R）后仍正常。

---

## 五、回传发布侧（Agent1 填空）

```
部署 URL：________________
Git SHA（实际构建）：________________
v5 浏览器验收（侧栏 ROI / 联动 / 复制）：通过 / 未通过
```

---

## 六、参考

- 短清单：`AGENT1_发布_直观清单.md`  
- 累计长版：`RELEASE_REQUEST_FOR_AGENT1.md`（可按需追加 §6 v5 一行）  
- ROI 定稿说明：`FORWARD_SHARECRM_AGENT_VALUE_ROI_HANDOFF.md`  
- 第四轮转发：`FORWARD_OPENCLAW_AGENT1_RELEASE_v4.md`

---

**文档版本：** v5 · 价值量化/ROI 页 + OpenClaw/Agent1 转发
