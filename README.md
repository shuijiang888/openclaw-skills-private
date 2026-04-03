# 盈利管理系统 Web（一期 MVP）

## 本地运行

在终端中进入本项目目录（注意必须是包含 `package.json` 的 `profit-web` 文件夹）：

```bash
cd "/Users/shuige888/Downloads/cursor工作0402/盈利管理系统/profit-web"
npm install
npx prisma db push
npm run db:seed
npm run dev
```

**必须保持该终端窗口打开**，看到 `Ready` 后再用浏览器访问：

- 首选：http://127.0.0.1:3000  
- 或：http://localhost:3000  

终端里若列出 `Network: http://192.168.x.x:3000`，在同一 WiFi 下的其他设备可用该地址访问。

右上角切换 **演示身份** 后再点「审批通过」，以匹配分层权限。

- **门户** `/`：价值主张、角色入口；可跳转 [Arena 线框原型](https://019d4e3d-06a8-7e3f-be0c-16fe2b7d6cdf.arena.site/) 对照信息架构  
- **工作台** `/dashboard`：数据概览  
- **管理后台** `/console`：客户主数据、项目 pipeline、系数与审批规则  

**关键用户演示脚本**：`../docs/DEMO_GUIDE.md`

### 打不开页面时

1. **是否已启动**：没有运行 `npm run dev` 时，任何浏览器都会「无法连接」。请先启动并等到出现 `Ready`。
2. **目录是否才对**：只有 `盈利管理系统/profit-web` 下执行 `npm run dev` 才会起服务；在上一级目录执行会无效。
3. **端口被占用**：若 3000 已被占用，可改用 `npx next dev -p 3001`，浏览器改为 http://127.0.0.1:3001 。
4. **代理/VPN**：若浏览器走了系统代理，可对 `127.0.0.1` 设为直连或暂时关闭代理再试。
5. **先看终端报错**：若 `npm run dev` 一行红字退出，把完整错误贴出来排查（常见为未装依赖，需先 `npm install`）。
6. **盈利罗盘报错 / 500**：多为本地库或 Prisma Client 未与当前 `schema.prisma` 对齐。在 `profit-web` 依次执行：`npx prisma generate`，再 `npm run db:repair && npm run db:seed`（或 `npx prisma db push && npm run db:seed`），然后**重启** `npm run dev` 并硬刷新 `/compass`。若仍失败，页面顶部会显示具体错误信息，便于排查。

## 文档

- 详细设计：`../docs/DESIGN.md`
- 操作手册概设：`../docs/OPERATION_MANUAL.md`
- 关键角色 Demo 说明：`../docs/DEMO_GUIDE.md`
- **价值主张 · 落地依赖 · 迭代前瞻（打包）**：`../docs/VALUE_STRATEGY_DEPLOYMENT_ROADMAP.md`（站内全文检索：`/strategy`；部署副本：`content/VALUE_STRATEGY_DEPLOYMENT_ROADMAP.md`，修改上级 docs 后请同步复制）

## 本机大模型（Ollama · 优先 qwen3.5:35b）

报价工作台右侧「智能助手」在 **`OLLAMA_ENABLED=1`** 时会**优先**走本机 Ollama（`/api/assistant/quote-parse`），失败则自动回退内置规则引擎，适合演示与实战联调。

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

## 技术栈

Next.js App Router · Prisma 5 · SQLite · Tailwind CSS 4
