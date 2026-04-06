# 盈利管理系统 Web（一期 MVP · 产品试点版）

## 本地运行

在终端中进入本项目目录（注意必须是包含 `package.json` 的 `profit-web` 文件夹）：

```bash
cd "/Users/shuige888/Downloads/cursor工作0402/盈利管理系统/profit-web"
npm install
npx prisma db push
npm run db:seed
npm run dev
```

### 使用真实库的安全提示
如果你的 `.env` 设置了 `DATABASE_URL="file:./prisma/real.db"`（或其他真实 SQLite 文件），请**不要**执行全量 `npm run db:seed`（会清空业务数据）。只需要：

```bash
npx prisma db push
npm run db:seed:reference
npm run dev
```

**必须保持该终端窗口打开**，看到 `Ready` 后再用浏览器访问：

- 首选：http://127.0.0.1:3000  
- 或：http://localhost:3000  

终端里若列出 `Network: http://192.168.x.x:3000`，在同一 WiFi 下的其他设备可用该地址访问。

**身份模式（双轨）**

- **演示模式（默认）**：右上角可切换 **试点角色**，由 `x-demo-role` 驱动权限与助手语境。
- **登录模式（推荐上线）**：设置 `PROFIT_AUTH_MODE=session` 与 `NEXT_PUBLIC_PROFIT_AUTH_MODE=session` 后，右上角为登录/退出；角色由账号绑定，服务端**忽略** `x-demo-role`。

- **门户** `/`：价值主张、角色入口；可跳转 [Arena 线框原型](https://019d4e3d-06a8-7e3f-be0c-16fe2b7d6cdf.arena.site/) 对照信息架构  
- **工作台** `/dashboard`：数据概览  
- **管理后台** `/console`：客户主数据、项目 pipeline、系数与审批规则  

**角色与流程说明**：`../docs/DEMO_GUIDE.md`（文件名保留历史，内容覆盖试点用法）

### CSV 批量导入模板与入口

| 模板文件（静态下载路径） | 表头与解析器一致 | 导入入口 |
| --- | --- | --- |
| `/templates/customers-import-template.csv` | `name`, `tier`, `arDays`（见 `lib/parse-customer-csv.ts`） | 管理后台 **主数据 · 客户** `/console/customers` → 客户 CSV 导入 |
| `/templates/projects-import-template.csv` | `customerName`, `projectName`, 成本四列及可选系数等（见 `lib/parse-project-csv.ts`） | **项目与审批** `/console/pipeline` → 项目 CSV 导入（`POST /api/console/import/projects`） |
| `/templates/compass-alert-rules-import-template.csv` | `conditionLabel`, `actionLabel`, `sortOrder`（见 `lib/parse-compass-alert-rules-csv.ts`） | **系数与规则** `/console/rules` → 罗盘对策矩阵批量导入（`POST /api/console/import/compass-alert-rules`） |

说明：表头大小写不敏感；客户/项目导入 API 还要求管理员权限（演示模式 `x-demo-role: ADMIN`，登录模式管理员账号）。

### 打不开页面时

1. **是否已启动**：没有运行 `npm run dev` 时，任何浏览器都会「无法连接」。请先启动并等到出现 `Ready`。
2. **目录是否才对**：只有 `盈利管理系统/profit-web` 下执行 `npm run dev` 才会起服务；在上一级目录执行会无效。
3. **端口被占用**：若 3000 已被占用，可改用 `npx next dev -p 3001`，浏览器改为 http://127.0.0.1:3001 。
4. **代理/VPN**：若浏览器走了系统代理，可对 `127.0.0.1` 设为直连或暂时关闭代理再试。
5. **先看终端报错**：若 `npm run dev` 一行红字退出，把完整错误贴出来排查（常见为未装依赖，需先 `npm install`）。
6. **盈利罗盘报错 / 500**：多为本地库或 Prisma Client 未与当前 `schema.prisma` 对齐。在 `profit-web` 依次执行：`npx prisma generate`，再 `npm run db:repair && npm run db:seed`（**仅空库**；已有业务数据请 `npx prisma db push && npm run db:seed:reference`），然后**重启** `npm run dev` 并硬刷新 `/compass`。若仍失败，页面顶部会显示具体错误信息，便于排查。

## 文档

- 详细设计：`../docs/DESIGN.md`
- 操作手册概设：`../docs/OPERATION_MANUAL.md`
- 角色与流程说明：`../docs/DEMO_GUIDE.md`
- **价值主张 · 落地依赖 · 迭代前瞻（打包）**：`../docs/VALUE_STRATEGY_DEPLOYMENT_ROADMAP.md`（站内全文检索：`/strategy`；部署副本：`content/VALUE_STRATEGY_DEPLOYMENT_ROADMAP.md`，修改上级 docs 后请同步复制）
- **Owner 单人总控闭环文档包（新增）**：
  - `content/AGENT_OWNER_PRD_V3.md`
  - `content/OWNER_AUTONOMOUS_EXECUTION_MODEL.md`
  - `content/AGENT_STANDALONE_INTEGRATED_ARCHITECTURE.md`
  - `content/TENCENT_CLOUD_LOW_COST_DEPLOYMENT_RUNBOOK.md`
  - `content/ROLL_OUT_300_USERS_OPERATION_PLAYBOOK.md`
  - 当前 Owner 决策基线：系统名 **智探007**；上线模式 **先 Standalone，后续对接纷享销客 OpenAPI**；预算档 **低**；荣誉风格 **专业权威**
- **智探007 在线演示发布包（IP 直连）**：
  - `deploy/zt007-cloud-demo/README.md`
  - `deploy/zt007-cloud-demo/publish-to-server.sh`（本地执行，自动打包上传）
  - `deploy/zt007-cloud-demo/apply-on-server.sh`（服务器执行，自动发布到 Nginx）

## 报价助手大模型（支持 MiniMax / Ollama）

报价工作台右侧「智能助手」支持两类模型通道（`/api/assistant/quote-parse`）：
- **MiniMax 在线模型**（如 `MiniMax-M2.7`）
- **本机 Ollama 模型**（如 `qwen3.5:35b`）

选择策略：
- 同时配置时默认优先 **MiniMax**
- 未配置或调用失败时自动回退**规则引擎**
- 可在公网场景开启“**每次调用口令校验**”控制成本

### 实战检查清单

1. 终端确认 Ollama 已监听：`curl -s http://127.0.0.1:11434/api/tags | head`
2. 确认模型已拉取：`ollama list` 中含 `OLLAMA_MODEL`（默认 `qwen3.5:35b`）
3. 前端打开任意项目工作台 → 助手面板点 **「检测连接」**：应显示「服务可达，模型已就绪」
4. 输入一段中文商机描述 → **「解析语义」**：首次 35B 推理可能需 **数十秒～数分钟**（视 GPU/CPU），默认请求超时 **5 分钟**（`OLLAMA_TIMEOUT_MS`）

### 配置步骤（MiniMax）

在 `profit-web/.env` 中添加：

```bash
MINIMAX_ENABLED=1
MINIMAX_API_KEY=你的MinimaxAPIKey
MINIMAX_BASE_URL=https://api.minimax.io/v1
MINIMAX_MODEL=MiniMax-M2.7
# 可选
MINIMAX_TIMEOUT_MS=90000
MINIMAX_TEMPERATURE=0.2
```

### 配置步骤（Ollama）

1. 安装并启动 [Ollama](https://ollama.com/)，拉取模型，例如：
   ```bash
   ollama pull qwen3.5:35b
   ```
   （若仓库名不同，以 `ollama list` 为准，并把下述 `OLLAMA_MODEL` 改成**完全一致**的名称。）
2. 在 `profit-web` 目录的 `.env` 中增加（可复制 `.env.example`）：
   ```bash
   OLLAMA_ENABLED=1
   OLLAMA_MODEL=qwen3.5:35b
   # 非默认端口：OLLAMA_BASE_URL=http://127.0.0.1:11434
   # 超时（毫秒），35B 建议不低于 300000
   OLLAMA_TIMEOUT_MS=300000
   # 若 Ollama 版本不支持 format:json，可关闭：OLLAMA_JSON_FORMAT=0
   ```
3. **重启** `npm run dev`。助手面板会显示「本机模型已启用」并可 **检测连接**。

若同时未设置 `MINIMAX_ENABLED=1` 与 `OLLAMA_ENABLED=1`，系统仅使用规则解析；可随时点击「仅用规则」。

### 公网成本控制：每次调用都要输入口令

在 `profit-web/.env` 中配置（推荐）：

```bash
# 生产默认开启；可显式控制
PROFIT_LLM_PASSWORD_REQUIRED=1

# 推荐配置哈希而非明文（二选一）
PROFIT_LLM_ACCESS_PASSWORD_SHA256=你的口令SHA256HEX
# 或：
# PROFIT_LLM_ACCESS_PASSWORD=明文口令
```

行为说明：
- 每次点击“解析语义”都会校验口令
- 口令通过才会调用 MiniMax/Ollama
- 未通过则不调用大模型（前端提示口令错误）

接口说明：`GET /api/assistant/ollama-status` 供面板自检；`POST /api/assistant/quote-parse` 单次解析最长由 `maxDuration` 与 `OLLAMA_TIMEOUT_MS` 共同约束。

## 发布版本与身份模式（当前 v0.3.4）

当前 **`package.json`** 与页脚、**`lib/app-release.ts`** 应对齐（当前 v`0.3.4`）。

### 身份模式说明
- **演示模式（默认）**：右上角可切换「试点角色」，由 `x-demo-role` 驱动权限与助手语境。
- **登录模式（推荐）**：设置 `PROFIT_AUTH_MODE=session` 后，右上角仅显示登录/退出；角色来自账号绑定，不再依赖 `x-demo-role`。

### 真实数据备份
```bash
npm run db:backup
```

会把当前 `DATABASE_URL` 指向的 SQLite 文件复制到 `prisma/backups/`（脚本内会自动加载 `.env`）。

### 真实库的可配置规则补齐
```bash
npm run db:seed:reference
```

该脚本只补齐「罗盘四象限阈值（CompassQuadrantThreshold）」与首次填充的「对策矩阵规则（CompassAlertRule）」；不会清空/覆盖客户与项目等业务数据。

### 探活
```bash
curl -s http://127.0.0.1:3000/api/health
```

### 发布防事故 + 验收脚本（P2）

```bash
# 本机预检（默认会构建 + 门禁校验 + 关键接口 smoke）
npm run release:preflight

# 若只做接口预检可跳过构建
SKIP_BUILD=1 npm run release:preflight

# 智探007验收脚本（默认线上地址，可传自定义 BASE_URL）
npm run zt:acceptance
npm run zt:acceptance -- http://127.0.0.1:3000
```

脚本要点：
- `release:preflight`：检查分支祖先关系、工作区洁净、构建、门禁认证、关键 API 200、监控非 critical。
- `zt:acceptance`：覆盖门禁、总览、行动卡、悬赏、提交反馈、个人工作台、作战大屏、监控、维护后台接口。

P2 第二批补充：
- 监控趋势查询：`GET /api/zt/monitoring/history?limit=24`（管理员）
- 告警 webhook（可选）：配置 `ZT_MONITORING_ALERT_WEBHOOK_URL` 后，`/api/zt/monitoring` 在出现告警时会尝试推送，并做 5 分钟同类节流

### 分系统 Smoke + 发布/回滚（P1-4）

```bash
# 分系统 smoke（BASE_URL 可选，默认本地）
npm run smoke:profit
npm run smoke:zt

# Nginx 白名单门禁（检查远端 profit-web.conf 包含关键路径）
npm run gate:nginx

# SHA 门禁（默认校验 HEAD，口径：origin + bare.git main + worktree）
npm run gate:sha

# 按系统发布（默认线上 BASE_URL=http://119.45.205.137, PAGE_PREFIX=/profit）
npm run release:profit
npm run release:zt

# 按系统回滚（默认回滚到 d9a757b_hotfix_backup）
npm run rollback:profit
npm run rollback:zt
```

脚本说明：
- `smoke:profit`：覆盖门户、健康、工作台、数据大屏、项目 API、罗盘 API、后台首页。
- `smoke:zt`：覆盖智探入口、总览、行动卡、悬赏、作战快照、监控、联动、console/system、console/users。
- `release:profit`：`release:preflight` → `smoke:profit` → `gate:nginx` → 部署 → `gate:sha` → `smoke:profit`。
- `release:zt`：`gate:nginx` → `release:preflight` → `smoke:zt` → `prisma db push`（可关）→ 部署 → `gate:sha`。
- `rollback:*`：执行远端 `git reset --hard <target>` + 更新 bare `main` 引用，再做 SHA 与对应系统 smoke 校验。
- `gate:nginx` 新增硬门禁：`nginx.conf` 必须包含 `include /etc/nginx/default.d/*.conf;`，否则直接失败，防止 `/profit/*` 路由失效造成“看似回滚”。

关键环境变量：
- `BASE_URL`（默认 `http://119.45.205.137`）
- `PAGE_PREFIX`（默认 `/profit`）
- `DEPLOY_SSH`（默认 `root@119.45.205.137`）
- `SKIP_SHA_GATE=1`（仅紧急排障时临时跳过，不建议）

### Docker 部署（生产发布）

仓库提供 `Dockerfile`（Next.js `output: "standalone"`）。

#### 方式 A：直接用 Docker 跑（SQLite 挂载）
```bash
docker build -t profit-web .
docker run -p 3000:3000 \
  -e DATABASE_URL="file:./prisma/real.db" \
  -e PROFIT_AUTH_MODE="session" \
  -e NEXT_PUBLIC_PROFIT_AUTH_MODE="session" \
  -e PROFIT_AUTH_SECRET="至少16位随机字符串" \
  -v /你的真实数据目录:/app/prisma \
  profit-web
```

其中 `/app/prisma/real.db` 必须存在，且与 `DATABASE_URL` 的路径一致。

#### 创建管理员账号
首次在该库上执行：
```bash
npx prisma generate && npx prisma db push
npm run auth:create-user -- '你的邮箱' '你的密码' ADMIN
```

### 角色与权限速查（演示模式下的「试点角色」）

| 试点角色 | 前台 | 报价智能助手 | 管理后台 |
| --- | --- | --- | --- |
| **销售经理** | 工作台、项目、新建、盈利罗盘；无「战略全文/路线图」 | 侧栏**上站清单**；助手在**总监及以上**开放 | 无入口 |
| **销售总监 / 副总裁** | 含战略全文、路线图 | **助手全开**（示例、角色话术追加、快捷操作） | 无入口 |
| **总经理** | 同总监档 | 同总监档 | 控制台、管线、**客户只读**、落地准备；**无** CSV 导入、规则页、审计页 |
| **管理员** | 同总经理档 | 同总监档 | **全部**：CSV 导入、系数与规则、**智能体审计** |

登录模式下角色与上表对应关系由账号绑定决定，详见 **`CHANGELOG.md`**。

生产运行：`npm run build && npm run start`（确保端口 3000 无占用）。

## 技术栈

Next.js App Router · Prisma 5 · SQLite · Tailwind CSS 4
