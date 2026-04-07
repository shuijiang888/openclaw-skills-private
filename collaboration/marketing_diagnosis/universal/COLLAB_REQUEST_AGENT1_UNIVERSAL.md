# 协同请求（给 Agent1）：通用营销诊断 H5 上线联动

> 来源：营销cursor 协同口径  
> 目标：将「通用营销诊断系统」入口切换到统一问卷页，并完成生产联调与门禁验证。  
> 说明：若本文件与主线发布规范冲突，以主线规范与 `LAUNCH_RUNBOOK_CHECKLIST_v1.md` 为准。

---

## 0）已知前提（营销cursor已完成）

- `h5_universal.html` 已支持生产 `apiBaseUrl` + `apiPathPrefix: ""`
- 接口对接：`/api/diag/submissions`、`/api/diag/leads`
- 提交响应兼容字段：`publicId` / `submissionId`

---

## 1）Agent1 待完成事项（必须全部完成）

1. 部署以下静态文件（建议 URL 保持相对路径可用）：
   - `collaboration/marketing_diagnosis/universal/h5_universal.html`
   - `collaboration/marketing_diagnosis/universal/data/questionnaire.bundle.js`
   - `collaboration/marketing_diagnosis/universal/data/rubrics.bundle.js`

   建议线上路径：
   - `/diag/universal/h5_universal.html`
   - 并保证 `./data/` 相对路径可访问

2. 门户「共享能力 · Agent工具卡」更新：
   - 将「通用营销诊断系统」卡片入口从 `/diag/h5_medical.html` 改为 `/diag/universal/h5_universal.html`
   - 医械/能源/智造三张卡片继续各自指向行业页（不变）

3. 生产 CONFIG 对齐：
   - `apiBaseUrl` = 现网 API 根（示例：`http://119.45.205.137/api/diag`，后续 HTTPS 替换）
   - `apiPathPrefix` = `""`

4. 按 `LAUNCH_RUNBOOK_CHECKLIST_v1.md` 执行冒烟并回传：
   - 新 URL
   - `curl -I` 结果
   - 答题 -> 报告 -> 线索提交流程结果
   - Git SHA

---

## 2）验收勾选（执行时填写）

- [ ] 通用 H5 首页可打开（200 + text/html + UTF-8）
- [ ] `./data/questionnaire.bundle.js` 可加载（200）
- [ ] `./data/rubrics.bundle.js` 可加载（200）
- [ ] 提交接口返回 `submissionId` 或 `publicId`
- [ ] 报告页可生成
- [ ] 线索接口成功落库（`leadKind` 合法）
- [ ] 门户卡片已切换到 `/diag/universal/h5_universal.html`
- [ ] 三行业卡片保持不变
- [ ] 回传 SHA + URL + 冒烟证据

