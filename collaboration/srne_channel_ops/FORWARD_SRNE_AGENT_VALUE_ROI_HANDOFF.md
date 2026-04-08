# 价值量化对比页 · 交接硕日能源 Agent（验收 / 评估 / 完善 → 再交发布）

**文档用途：** 请业务方将本文 **整段或整文件** 转发给 **硕日能源侧负责 SRNE 的 Agent**。由该 Agent **验收功能、评估模型与文案、按需完善**；定稿并合并到你们约定的部署分支后，再通知 **发布侧（Cursor / Agent1）** 按既有流程构建与上线。

**说明：** 本页为 **纯前端能力**，不新增后端接口；预填数据使用既有 `GET /v1/analytics/overview`、`/v1/scenarios/playbook`、`/v1/performance/scorecard`。

---

## 一、交付摘要（当前实现）

| 项 | 内容 |
|----|------|
| **功能名** | 价值主张 · 量化对比（侧栏：**价值量化对比**） |
| **代码分支** | `cursor/value-roi-page-ddb3`（相对基分支 `cursor/agent-2fd9`） |
| **合并请求** | 私库 PR：**#6**（标题含「价值量化对比」；以实际仓库为准） |
| **涉及文件** | `web/index.html`（导航 + `data-view="valueRoi"` 整段）<br>`web/app.js`（`loadValueRoi`、`prefillRoiFromSystem`、`computeRoi`、Chart.js 三图）<br>`web/styles.css`（`.roi-*` 样式） |
| **后端** | 无变更；Docker 仍只需带更新后的 `web/` |

---

## 二、产品行为（供验收）

1. **入口：** 登录后侧栏在「全场景价值图谱」下新增 **「价值量化对比」**。
2. **左栏（代价模型）：** 年出货基数、毛利率、Critical/未关预警数、平均逾期天数、停滞周数、每周机会侵蚀%、单条预警摩擦系数等；底部展示分项与年度代价合计（演示口径）。
3. **右栏（收益模型）：** 出货提升%、毛利改善百分点、逾期下降天数、资金成本%、Critical 可减少比例、情报增量% 等；底部展示分项与年度收益合计。
4. **顶部摘要：** 年度代价、年度收益、净影响（收益 − 代价）。
5. **按钮：**  
   - **从系统拉取建议值**：并发调用上述三个已有 API，写入部分字段（出货、预警、逾期、作战台覆盖缺口推导停滞周数、达成指数推导提升% 等）。  
   - **恢复默认假设**：恢复内置默认数字。  
   - **复制对比摘要**：剪贴板（失败则 `prompt`），文案标明演示模型。
6. **图表：** 左右横向堆叠条（代价构成 / 收益构成）+ 下方双柱对比；本页使用独立图表注册表，避免在输入时销毁总览/绩效页的 Chart。

---

## 三、请硕日能源 Agent 重点评估（建议逐项回复）

1. **公式与系数：** 当前 `computeRoi` 为演示用简化式（机会停滞、预警摩擦、资金占用、各类收益项）。是否与贵司价值主张、销售话术一致？是否需要按区域/币种/财年调整？
2. **预填映射：** `overview` / `playbook` / `scorecard` 字段到表单的映射是否合理？缺字段时的默认行为是否可接受？
3. **文案与合规：** 顶部说明、摘要区「演示模型，非财务承诺」是否足够？是否需法务/商务审阅用语？
4. **与现有页面关系：** 是否与「全场景价值图谱」「业务作战台」「绩效看板」的叙事重复或冲突？是否需要从作战台/总览增加跳转入口？
5. **无障碍与国际化：** 若后续要英文化或无障碍，可在此版结构上迭代。

**若需大改：** 可在合并本 PR 后直接改 `app.js` 中 `ROI_DEF`、`readRoiModel`、`computeRoi`、`prefillRoiFromSystem` 等；无需动 API 亦可扩展。

---

## 四、快速自检（合并后、发布前）

在仓库根目录（或 `collaboration/srne_channel_ops/` 内）：

```bash
grep -q 'data-nav="valueRoi"' collaboration/srne_channel_ops/web/index.html && echo OK nav
grep -q 'function loadValueRoi' collaboration/srne_channel_ops/web/app.js && echo OK load
grep -q 'chartRoiCompare' collaboration/srne_channel_ops/web/index.html && echo OK canvas
grep -q '\.roi-hero' collaboration/srne_channel_ops/web/styles.css && echo OK css
```

本地验收：打开 `web/index.html`（或经网关 `/srne/`），登录 → **价值量化对比** → 改数字图表应刷新；**从系统拉取建议值** 在已登录且 API 可用时应写入部分字段。

---

## 五、完善后 → 交给发布侧

请硕日能源 Agent **完成以下任一项后** 再 @ 发布侧：

1. 将定稿提交 **合并** 到团队约定的部署分支（如私库 `main` 或与 **Scheme A** 一致的 `origin/main` 源）；或  
2. 明确给出 **可部署的 Git SHA** 与 **分支名**，并说明「价值量化对比」已包含在内。

发布侧（Cursor 协同 + **Agent1**）将按 **`AGENT1_发布_直观清单.md`** 对 `collaboration/srne_channel_ops/` 执行 **Docker build --no-cache**、**up**，并在浏览器验收侧栏出现 **价值量化对比** 且交互正常。

**发布侧回传可含：** 部署 SHA、公网基址、硬刷新后截图或勾选项（与本文第二节对照）。

---

## 六、版本锚点（由硕日能源 Agent 或 OpenClaw 推送后填写）

| 项 | 内容 |
|----|------|
| 验收通过合并分支 | ________________ |
| Git SHA（短） | ________________ |
| 发布完成 SHA | ________________ |
| 公网验收 URL（可选） | ________________ |

---

*文档版本：v1 · 价值量化对比交接 · 2026-04-08*
