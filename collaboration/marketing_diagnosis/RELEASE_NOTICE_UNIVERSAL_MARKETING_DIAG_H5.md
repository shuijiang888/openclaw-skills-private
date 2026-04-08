# 通用营销诊断（陈玮 universal H5）· 正式发布通知

**文档用途：** 业务方将本文 **转发** 给 **OpenClaw（或代码维护人）** 与 **运维 Agent1**；各方 **只做与本角色相关的步骤**。  
**技术细节补充：** 与同目录 **`FORWARD_AGENT1_UNIVERSAL_H5_DEPLOY.md`** 互为补充；路径、变更摘要、可选校验脚本等以两份文档为准。

---

## 一、本次发布锚点（已定稿）

| 项 | 值 |
|----|-----|
| **源分支** | `cursor/value-roi-page-ddb3` |
| **短 SHA** | `7e81d7f` |
| **说明** | 含 `h5_universal.html` 本轮修正（PDF 懒加载、`apiBaseUrl` 默认可移植、session/syncUi、bundle 与报告防护等）及 `scripts/validate_bundles.mjs`。 |

**OpenClaw / 维护人：** 若团队约定以 **`main`**（或私库其他分支）为唯一部署源，请先将上述提交 **合并/推送** 到该分支，并在群内 **更新**「源分支 + 短 SHA」；Agent1 以 **最终约定分支上的 HEAD** 为准拉取。

**阻塞时：** 可按既有流程提供 **`cursor-out`** 包或指定 cherry-pick `7e81d7f`，确保现网拿到的 `h5_universal.html` 与校验脚本版本一致。

---

## 二、分工

### 2.1 开发（OpenClaw / 维护人）

1. 确认 **`collaboration/marketing_diagnosis/universal/h5_universal.html`** 与（建议一并保留的）**`collaboration/marketing_diagnosis/universal/scripts/validate_bundles.mjs`** 已进入 **约定合并分支**。
2. 在 `universal` 目录执行 **`node scripts/validate_bundles.mjs`**，**退出码须为 0**。
3. **push** 后向运维发：**分支名 + 短 SHA**（若与第一节不同，以实际推送结果为准）。

### 2.2 运维（Agent1）

1. 按运维收到的 **SHA** 在仓库中 **检出对应版本**（或从指定分支 pull 到该 SHA）。
2. **覆盖** 现网静态目录中的 **`h5_universal.html`**（路径与现网一致即可，常见示例：`/opt/marketing-diag/static/universal/h5_universal.html`）。
3. **若** `data/questionnaire.bundle.js`、`data/rubrics.bundle.js` 相对现网有变更，则 **同步** 这两个 bundle；**若** 本次仅改 HTML、bundle 未变，可只覆盖 HTML。
4. **生产环境** 在部署的 HTML 中配置 **`CONFIG.apiBaseUrl`** 为真实诊断 API 根（无末尾 `/`，如 `https://域名/api/diag`）。仓库默认 `""` 仅为可移植；**需要联调提交/同步 CRM 时不可留空**。
5. 按 **第五节** 做最小验收，按 **第六节** 回执。

---

## 三、制品清单（仓库路径）

| 路径 | 必发 / 可选 |
|------|-------------|
| `collaboration/marketing_diagnosis/universal/h5_universal.html` | **必部署**（覆盖现网） |
| `collaboration/marketing_diagnosis/universal/data/questionnaire.bundle.js` | 有变更则同步 |
| `collaboration/marketing_diagnosis/universal/data/rubrics.bundle.js` | 有变更则同步 |
| `collaboration/marketing_diagnosis/universal/scripts/validate_bundles.mjs` | **可选**（发布前校验；可不进静态站点） |

---

## 四、变更与配置要点（摘要）

详见 **`FORWARD_AGENT1_UNIVERSAL_H5_DEPLOY.md` 第三节**，主要包括：

- head 内 **不再同步加载** html2pdf；点击「下载 PDF」时再 **动态加载**（cdnjs → jsDelivr 兜底）。
- **`apiBaseUrl`** 仓库默认为 `""`；**现网必须写入生产 API 根**（若需联调）。
- 非销售岗 session **不误带** `saleMode`；**`syncUiFromState`** 与角色/模式高亮一致。
- **`Q.default` / `R.default`**、**`gradeBands` / `generic_by_band`** 防护、报告 **escHtml**、无 **options** 时 Toast、**`buildAssessmentPayload`** 无 `result` 时降级。
- **`window.__UNIVERSAL_STATIC_ROOT__`** 与 **`__UNIVERSAL_STATIC_BASE__`** 同值。

---

## 五、最小验收（运维 / Agent1）

1. **完整 URL** 打开 H5 → 能进入问卷，**不出现**「数据加载失败」或问卷空白（若异常：控制台 `[diag]`、两个 `data/*.bundle.js` 是否 200）。
2. **任选一角色** 走通至报告页 → 点击 **「下载 PDF」** → 首次出现加载提示后能生成 PDF，或失败时出现 Toast（可用浏览器打印兜底）。
3. 若本环境需要 **接口联调**：确认页面内 **`apiBaseUrl`** 已为生产地址，且提交/线索请求打到预期网关。

---

## 六、回执模板（请 Agent1 回复时填写）

```
【通用营销诊断 universal H5 发布回执】
部署时间（UTC+8）：________________
拉取分支：________________
Git 短 SHA：________________
覆盖文件：h5_universal.html（是/否）；bundle 是否同步（是/否/不适用）
现网 h5 路径：________________
CONFIG.apiBaseUrl 已配置为：________________（若未配置请写「未配置」并说明是否需联调）
第五节验收：项1 通过/不通过；项2 通过/不通过；项3 通过/不适用/不通过
文件校验（可选）：sha256 或 md5：________________
备注：________________
```

---

## 七、OpenClaw 推送后简讯（可复制）

```
universal H5 发布代码已就绪。
分支：cursor/value-roi-page-ddb3
短 SHA：7e81d7f
validate_bundles：已通过（退出码 0）。
请 Agent1 按 RELEASE_NOTICE_UNIVERSAL_MARKETING_DIAG_H5.md 第五节、第六节执行。
（若已合并至 main，请以实际 main HEAD SHA 为准。）
```

---

*文档版本：v1 · 2026-04-08 · 发布锚点随合并可更新第一节*
