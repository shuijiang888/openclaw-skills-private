# 通用营销诊断 H5（universal）· 转发 Agent1 覆盖部署

**来源：** 营销 Cursor 发布说明 + 本仓库已对齐的代码变更。  
**用途：** 请业务方将本文 **整段转发** 给 **Agent1**，按现网目录 **覆盖部署** `h5_universal.html`，部署后 **回传 commit 或文件 SHA** 便于对账。

---

## 一、必发文件

| 文件（仓库路径） | 说明 |
|------------------|------|
| `collaboration/marketing_diagnosis/universal/h5_universal.html` | **必部署** |

**现网建议路径（与现网一致即可）：**

`/opt/marketing-diag/static/universal/h5_universal.html`

（若 Nginx 实际 alias 不同，以现网为准，保证浏览器打开的 `h5_universal.html` 为本次文件。）

---

## 二、可选文件（不进静态站点也可）

| 文件 | 说明 |
|------|------|
| `collaboration/marketing_diagnosis/universal/scripts/validate_bundles.mjs` | 构建/发布前在构建机上执行校验 |

```bash
cd collaboration/marketing_diagnosis/universal
node scripts/validate_bundles.mjs
```

退出码 0 表示题本与 rubrics 基础结构检查通过。

---

## 三、变更摘要（验收对照）

1. **去掉 head 内同步加载的 html2pdf（cdnjs）**，避免国内网络阻塞导致后续 `questionnaire.bundle.js` / `rubrics.bundle.js` 不执行；**PDF 改为点击「下载 PDF」时再动态加载**（cdnjs → jsDelivr 兜底）。
2. **`CONFIG.apiBaseUrl` 默认改为 `""`**，仓库可移植；**现网部署版本请务必改成真实诊断 API 根**（无末尾 `/`，例如 `https://你的域名/api/diag`），否则联调提交不会走 v1 API。
3. **session 恢复：** 非销售岗不再误带历史 `saleMode`；恢复 session 后 **`syncUiFromState`** 与角色/模式按钮高亮一致。
4. **题本兼容：** 支持 `Q.default` / `R.default` 等嵌套导出（在解包 `*_BUNDLE` 之后）。
5. **研判与报告：** `gradeBands` / `generic_by_band` 空值保护；报告维度解读正文 **escHtml**；摘要中等级区间用安全默认值。
6. **题目无 `options`：** **Toast** 提示，不崩页。
7. **`buildAssessmentPayload`：** `state.result` 为空时安全降级（`scores`/`summary` 可为 `null`）。
8. **排查口径：** 补充 **`window.__UNIVERSAL_STATIC_ROOT__`**（与现有 **`__UNIVERSAL_STATIC_BASE__`** 同值）。

---

## 四、部署后自测（Agent1）

1. 用 **完整 URL** 打开 H5 → 能进入问卷，**非**「数据加载失败 / 问卷为空」（若仍失败，查控制台 `[diag]` 与两个 `data/*.bundle.js` 是否 200）。
2. 任选角色走通到报告 → 点 **「下载 PDF」** → 首次应短暂「正在加载 PDF 组件…」，随后生成或失败时 Toast 提示可用浏览器打印。
3. 若需 **联调提交**：确认页面内 **`apiBaseUrl`** 已指向现网（部署时可在覆盖前对单文件做一次替换，或按团队约定由构建注入）。

---

## 五、回传（请 Agent1 填写）

```
部署文件：h5_universal.html
Git commit（短 SHA）：________________
或 文件校验：sha256sum / md5：________________
部署时间：________________
apiBaseUrl 现网值（是否已配置）：________________
```

---

## 六、代码来源说明（给 Agent1）

若服务器拉取的分支 **不是** 包含本变更的 `main`，请从协作方指定的 **分支名** 或 **cherry-pick 对应提交** 取得 `h5_universal.html`（及可选 `scripts/validate_bundles.mjs`），再覆盖现网。**勿仅用旧分支上的同名文件。**

---

*文档版本：2026-04-08*
