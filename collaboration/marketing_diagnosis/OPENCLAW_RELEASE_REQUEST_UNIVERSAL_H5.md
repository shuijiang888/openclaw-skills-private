# OpenClaw 发布诉求 · 通用营销诊断（陈玮 universal H5）

**致：** OpenClaw（小江 / 维护侧）  
**来源：** 营销 Cursor 正式发布诉求 + 仓库内既有发布说明  
**目的：** 请 OpenClaw **在具备部署机权限的前提下**，尝试完成 **现网静态覆盖 + 生产 `apiBaseUrl` + 最小验收**；若无机器权限，请将本文 **转交 Agent1** 执行同样步骤并回传。

---

## 一、背景与历史口径（便于对齐）

- **制品形态：** 静态 H5 + 两个 JS bundle（`questionnaire.bundle.js` / `rubrics.bundle.js`），不经 Next 构建；历史上由运维将文件放到 **Nginx 静态目录**（常见示例 **`/opt/marketing-diag/static/`**），对外路径多为 **`/diag/universal/`** 下访问（具体以现网 Nginx 为准）。
- **门户入口：** 若门户卡片指向 `…/diag/universal/h5_universal.html`，本次覆盖后应仍指向同一 URL，**无需改门户**（除非现网入口路径与文档不一致，以现网为准）。
- **本轮性质：** **正式发布**（非仅代码合并）；营销侧关注 **国内网络下首屏可执行问卷**（head 内不再同步阻塞 html2pdf）、**session/题本/报告健壮性**、**生产联调时 `apiBaseUrl`**。

---

## 二、代码锚点（已定稿）

| 项 | 值 |
|----|-----|
| **仓库** | `https://github.com/shuijiang888/openclaw-skills-private.git` |
| **分支** | **`main`** |
| **发布锚点短 SHA** | **`c0ee6d7`** |
| **开发侧状态** | 已与历史协作提交 **`7e81d7f`** 核对：`h5_universal.html` **功能一致**（仅注释微调）；**`validate_bundles` 在 `c0ee6d7` 上通过** ✅ |

---

## 三、请 OpenClaw 执行的步骤

### 3.1 取码（部署机或本机打包源）

在**能访问 GitHub 私库**的环境执行：

```bash
git clone https://github.com/shuijiang888/openclaw-skills-private.git
cd openclaw-skills-private
git fetch origin
git checkout c0ee6d7
```

若部署机仅用 **同步包**：从已检出 **`c0ee6d7`** 的目录，对下列路径做 **scp/rsync** 至现网（路径见 3.3）。

**（可选）发布前校验：**

```bash
cd collaboration/marketing_diagnosis/universal
node scripts/validate_bundles.mjs
```

退出码须为 **0**（你方已在 `c0ee6d7` 上核实通过，若环境有 Node 可再跑一遍留痕）。

### 3.2 覆盖现网文件

**必覆盖：**

- 源：`collaboration/marketing_diagnosis/universal/h5_universal.html`  
- 目标：**现网「与浏览器实际访问一致」的同名路径**（常见：`/opt/marketing-diag/static/universal/h5_universal.html`；**若现网 alias 不同，以现网为准**）。

**建议一并同步（省事、与校验过的 tree 一致）：**

- `collaboration/marketing_diagnosis/universal/data/questionnaire.bundle.js`  
- `collaboration/marketing_diagnosis/universal/data/rubrics.bundle.js`  

若你方确认相对现网 **bundle 字节级未变**，可只发 HTML；**若有任何疑问，建议两包与 HTML 同发**，避免「只更 H5、旧 bundle 不兼容」的隐性故障。

### 3.3 生产配置：`CONFIG.apiBaseUrl`

仓库内默认为 **`""`**（可移植）。**现网覆盖后必须在 HTML 内写入真实诊断 API 根**：

- **格式：** 无末尾 **`/`**（例：`https://你的域名/api/diag` 或团队约定的内网网关根）。
- **实现方式：** `sed` 替换、`CONFIG` 注入脚本、或手工编辑**唯一一份**线上 `h5_universal.html` 均可；部署后建议 `grep -n apiBaseUrl` 核对。

**若本环境暂不需要联调提交：** 仍建议与业务确认是否必须填生产地址；**需要**线索/测评同步 CRM 或 v1 API 时 **不可留空**。

### 3.4 自测与回执

请严格按同目录 **`RELEASE_NOTICE_UNIVERSAL_MARKETING_DIAG_H5.md`**：

- **第五节：** 最小验收（完整 URL 进问卷、报告页下载 PDF 行为、`apiBaseUrl` 联调项若适用）。  
- **第六节：** 填写回执模板，**回传给业务 / 营销 Cursor / 发布协调方**，便于对账。

**建议回执中写明：** 实际 **现网绝对路径**、**拉取 SHA**、**是否同步 bundle**、**生产 `apiBaseUrl` 是否已写入**（可脱敏为域名级）。

---

## 四、参考文档（仓库内）

| 文件 | 用途 |
|------|------|
| `collaboration/marketing_diagnosis/RELEASE_NOTICE_UNIVERSAL_MARKETING_DIAG_H5.md` | 锚点、分工摘要、**第五/六节**验收与回执 |
| `collaboration/marketing_diagnosis/FORWARD_AGENT1_UNIVERSAL_H5_DEPLOY.md` | 变更技术摘要、路径示例、可选校验命令 |
| `collaboration/marketing_diagnosis/universal/COLLAB_REQUEST_AGENT1_UNIVERSAL.md` | 历史协作：入口 URL、`apiPathPrefix` 等说明 |

---

## 五、权限与交接

- **若 OpenClaw 具备** 部署机 SSH/同步权限：请按第三节执行完毕并回传第六节。  
- **若无权限：** 请将 **第二节锚点 + 第三节步骤** 原样转给 **Agent1**，由 Agent1 上机执行；OpenClaw 保留 **合并与 SHA 说明** 即可。

---

## 六、给 OpenClaw 的一键转发摘要（可复制）

```
【OpenClaw 执行 · universal H5 现网发布】
仓库：https://github.com/shuijiang888/openclaw-skills-private.git · main · SHA c0ee6d7
1) 部署机：git fetch && git checkout c0ee6d7（或从检出目录 scp）
2) 用该 tree 下 collaboration/marketing_diagnosis/universal/h5_universal.html 覆盖现网同名文件
3) 建议同步 universal/data/*.bundle.js（与 c0ee6d7 一致；validate_bundles 已通过）
4) 生产 HTML 内设置 CONFIG.apiBaseUrl（无末尾 /）
5) 按 collaboration/marketing_diagnosis/RELEASE_NOTICE_UNIVERSAL_MARKETING_DIAG_H5.md 第五节自测、第六节回执
详版：collaboration/marketing_diagnosis/OPENCLAW_RELEASE_REQUEST_UNIVERSAL_H5.md
```

---

*文档版本：v1 · 供 OpenClaw 试发 universal H5 · 2026-04-08*
