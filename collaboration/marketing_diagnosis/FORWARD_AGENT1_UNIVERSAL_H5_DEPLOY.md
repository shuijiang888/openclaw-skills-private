# 转发 Agent1：通用营销诊断 universal H5 覆盖部署

> 与营销侧发给 Agent1 的短消息配套；**详细变更、自测、回传模板**见下文。

---

## 1. 必做 / 可选

| 类型 | 路径 |
|------|------|
| **必部署（静态）** | `collaboration/marketing_diagnosis/universal/h5_universal.html` |
| **可选（CI / 本地）** | `collaboration/marketing_diagnosis/universal/scripts/validate_bundles.mjs` |

建议现网路径（与你们一致即可）：  
`/opt/marketing-diag/static/universal/h5_universal.html`  
同目录 **`data/questionnaire.bundle.js`、`data/rubrics.bundle.js`** 若未变可不动；若营销侧有更新需一并同步。

---

## 2. 现网 CONFIG

仓库内 **`h5_universal.html`** 中 **`CONFIG.apiBaseUrl` 默认为 `""`**（便于本地与多环境可移植）。

**部署到生产时**，请在**实际服务文件**中改为真实诊断 API 根，例如：

- `https://<你们的域名>/api/diag`  
或你们网关约定的等价根（**无末尾 /**）。

`apiPathPrefix` 若 API 已为完整前缀（请求形如 `.../api/diag/submissions`），保持 **`""`**。

---

## 3. 变更摘要（本轮）

1. **脚本顺序**：`head` 中 **不再同步加载** 境外 `html2pdf`（cdnjs）；**先加载** `./data/questionnaire.bundle.js` 与 `./data/rubrics.bundle.js`，避免国内网络阻塞导致 **Q/R 未定义**。  
2. **PDF**：点击「下载 PDF」时 **`loadHtml2Pdf()`** 动态加载（cdnjs → jsdelivr 兜底）。  
3. **session**：仅 **`sales_rep`** 恢复 `saleMode`；**`syncUiFromState`** 同步角色/模式按钮高亮。  
4. **题本兼容**：`UNIVERSAL_*` / `*_BUNDLE`；**`Q.default` / `R.default`** 等嵌套导出。  
5. **研判与报告**：`gradeBands` / `generic_by_band` 防护；报告关键字段 **转义**；题目 **无 options** 时 Toast 而非白屏。  
6. **`buildAssessmentPayload`**：`state.result` 为空时安全结构。  
7. **静态根**：`__UNIVERSAL_STATIC_BASE__` 与 **`__UNIVERSAL_STATIC_ROOT__`** 同值。

---

## 4. 可选校验命令

在仓库 **`collaboration/marketing_diagnosis/universal/`** 下：

```bash
node scripts/validate_bundles.mjs
```

通过表示 **questionnaire + rubrics** 结构（四模式销售 + 两非销售角色等）与脚本预期一致。

---

## 5. 部署后自测（建议）

1. 浏览器打开 **`…/diag/universal/h5_universal.html`**（完整 URL）。  
2. **Network**：首屏应加载两个 **`data/*.bundle.js`**；**不应**在问卷脚本前卡住 **cdnjs html2pdf**。  
3. 任选 **角色**（销售则 **四模式**）→ 基本信息 → **进入问卷** → 能出现题目。  
4. 做到出 **报告** → **下载 PDF**（首次可能出现「正在加载 PDF 组件」）。  
5. 若需联调提交：确认 **`apiBaseUrl`** 指向现网后，**提交线索 / 同步测评** 无跨域或 404。

---

## 6. 对账：分支 / 提交（请以实际为准）

- 若你们从 **`main`** 拉取且已合并 universal 修订，**以 `main` 上该文件最新提交为准**。  
- 若约定从分支 **`cursor/value-roi-page-ddb3`** 取文件，请确认该分支**已包含**上述 `h5_universal.html` 修订后再部署。  
- 短 SHA **`7e81d7f`**：为营销侧提供的**对账锚点示例**；若本地/远端无此提交，请以**实际推送的 commit**替换，避免硬编码错误 SHA。

**建议维护人推送后在下面更新一行真实值：**

| 项 | 值 |
|----|-----|
| 源分支 | `________________` |
| `h5_universal.html` 提交（短 SHA） | `________________` |
| 部署后服务器文件 `sha256sum`（可选） | `________________` |

---

## 7. 回传模板（请 Agent1 填）

```
1) 部署 commit（短 SHA）：________
2) 静态路径：________
3) h5_universal.html SHA256（可选）：________
4) 自测：□ 进问卷 □ 报告 □ PDF □ API 提交（按需打勾）
5) apiBaseUrl 现网配置：________（可打码域名）
```

---

**文档版本：** v1 · 与营销侧转发邮件/IM 同步更新。
