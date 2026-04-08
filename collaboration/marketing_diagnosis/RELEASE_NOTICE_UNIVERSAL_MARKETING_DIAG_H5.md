# 发布通知：通用营销诊断（陈玮 universal H5）

**文档性质：** 正式发布说明 · 开发与运维按需执行  
**适用范围：** `collaboration/marketing_diagnosis/universal/` 静态 H5 及配套校验脚本  
**关联说明：** 详细技术摘要与回传模板见同目录下 `FORWARD_AGENT1_UNIVERSAL_H5_DEPLOY.md`（若已创建）。

---

## 一、发布目标

将 **通用营销诊断** 前端（陈玮全量流程：三角色 × 四销售模式、报告、PDF、线索/商机接口对接）以 **可复现的 Git 版本** 交付运维部署，并与现网 **诊断 API** 正确联动。

---

## 二、交付物清单

| 序号 | 路径 | 必/选 | 说明 |
|------|------|--------|------|
| 1 | `collaboration/marketing_diagnosis/universal/h5_universal.html` | **必** | 唯一必须在现网静态目录覆盖的页面文件 |
| 2 | `collaboration/marketing_diagnosis/universal/data/questionnaire.bundle.js` | 视变更 | 题本有更新时与 H5 同步部署 |
| 3 | `collaboration/marketing_diagnosis/universal/data/rubrics.bundle.js` | 视变更 | 研判包有更新时与 H5 同步部署 |
| 4 | `collaboration/marketing_diagnosis/universal/scripts/validate_bundles.mjs` | 选 | 发布前/CI 校验 bundle 结构，**不要求**拷贝到公网静态目录 |

---

## 三、职责分工（按需执行）

### 3.1 开发侧（OpenClaw / Cursor 维护人或等价角色）

**目标：** 保证仓库内存在 **可指向的、已验证的提交**。

按需执行：

1. 确认 `h5_universal.html` 与（若需）两个 `data/*.bundle.js` 为当前 intended 版本。  
2. 在 `universal/` 目录执行：  
   `node scripts/validate_bundles.mjs`  
   通过后再进入 Git 流程。  
3. **提交并推送** 至团队约定的远程分支（如 `main` 或产品指定分支）。  
4. 将以下信息发给运维/Agent1（可复制「第六节 回执模板」）：  
   - 仓库 URL（或约定标识）  
   - **分支名**  
   - **`h5_universal.html` 所在提交的短 SHA**（或 tag）  
   - （可选）`sha256sum h5_universal.html`  

**说明：** OpenClaw 仅承担 **代码与 Git 真相源**；**不替代** 服务器上的文件覆盖与网关配置。

### 3.2 运维侧（Agent1 或等价部署角色）

**目标：** 现网用户访问路径下得到 **与 Git 一致** 的静态文件，且 **API 根地址** 正确。

按需执行：

1. 按开发侧提供的 **分支 + SHA**（或 tag）拉取代码，取出对应路径下的 `h5_universal.html`（及变更的 bundle）。  
2. 覆盖部署至现网约定目录（示例：`/opt/marketing-diag/static/universal/h5_universal.html`，**以现网规范为准**）。  
3. **生产环境** 在部署的 HTML 内将 **`CONFIG.apiBaseUrl`** 配置为真实诊断 API 根（如 `https://<域名>/api/diag`）。  
   - 仓库默认可能为 `""`，便于多环境；**现网不得长期留空**（除非你们明确采用同源相对路径并由网关统一转发）。  
4. 确认静态资源：`/diag/universal/data/*.bundle.js` 可访问且 **Content-Type** 为脚本类型。  
5. 按「第五节」做 **最小验收**，并 **回传第六节模板**。

---

## 四、配置约定（现网）

| 配置项 | 说明 |
|--------|------|
| `CONFIG.apiBaseUrl` | 生产填 **真实 API 根**，无末尾 `/` |
| `CONFIG.apiPathPrefix` | 若 API 已为完整前缀（如 `/api/diag` 已含服务路径），一般为 **`""`** |
| 静态入口 | 门户/卡片指向 **`…/diag/universal/h5_universal.html`**（与现网路径一致即可） |

---

## 五、最小验收（建议运维自测）

- [ ] 完整 URL 打开 H5，**无**「数据加载失败」、**无**「问卷数据为空 / 题本结构不兼容」（在已正确选择角色与销售模式前提下）。  
- [ ] Network：两个 `data/*.bundle.js` **200**，且响应为 **JS**（非 HTML 登录页）。  
- [ ] 可走通：**角色 →（销售则模式）→ 基本信息 → 问卷 → 报告**；「下载 PDF」可触发（允许首次拉取 CDN 组件）。  
- [ ] 若需联调：**提交线索 / 同步测评** 请求到达预期 API，无错误 CORS/404。

---

## 六、回执模板（请执行方填写后回复）

```
【通用营销诊断 H5 发布回执】
1. 执行方：□ 开发（Git） □ 运维（部署）
2. 仓库 / 分支：________________
3. 部署所用 commit（短 SHA）：________________
4. 静态文件路径：________________
5. h5_universal.html SHA256（可选）：________________
6. 现网 apiBaseUrl（可脱敏）：________________
7. 第五节验收：□ 全部通过 □ 部分通过（说明：________）
8. 异常与待办：________________
```

---

## 七、版本与文档

- 若本发布仅涉及 **H5 逻辑与加载顺序** 等前端修订，**bundle 未改** 时运维可 **只覆盖 `h5_universal.html`**。  
- 后续迭代请更新本通知或附录中的 **「发布记录」**（日期 + SHA + 简述），避免口头约定漂移。

---

**发布通知结束。** 各执行方按上表 **按需认领步骤** 即可，无需全部角色重复同一操作。
