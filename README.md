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

## 本机大模型（Ollama · 优先 qwen3.5:35b）

报价工作台右侧「智能助手」在 **`OLLAMA_ENABLED=1`** 时会**优先**走本机 Ollama（`/api/assistant/quote-parse`），失败则自动回退内置规则引擎，适合试点联调与实战。

### 实战检查清单

1. 终端确认 Ollama 已监听：`curl -s http://127.0.0.1:11434/api/tags | head`
2. 确认模型已拉取：`ollama list` 中含 `OLLAMA_MODEL`（默认 `qwen3.5:35b`）
3. 前端打开任意项目工作台 → 助手面板点 **「检测连接」**：应显示「服务可达，模型已就绪」
4. 输入一段中文商机描述 → **「解析语义」**：首次 35B 推理可能需 **数十秒～数分钟**（视 GPU/CPU），默认请求超时 **5 分钟**（`OLLAMA_TIMEOUT_MS`）

### 配置步骤

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

未设置 `OLLAMA_ENABLED=1` 时，不访问 Ollama，仅使用规则解析；可随时点击「仅用规则」。

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
