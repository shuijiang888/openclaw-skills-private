# Changelog

## 0.3.4 — 2026-04-03

- **模板与导入**：新增罗盘对策矩阵的 CSV 模板（`public/templates/compass-alert-rules-import-template.csv`）以及批量导入入口：
  - `/console/rules` 页面支持下载模板并上传导入
  - `POST /api/console/import/compass-alert-rules`（仅管理员）

## 0.3.3 — 2026-04-03

- **规则配置**：`/api/console/compass-alert-rules*` 与 `/api/console/compass-quadrant-threshold` 增加管理员鉴权；前端编辑器补齐 `demoHeaders()`，避免 demo 模式写库无鉴权。
- **本地模型赋能**：`POST /api/assistant/quote-parse` 每次请求从库读取当前 `CompassQuadrantThreshold` 与 `CompassAlertRule`，注入本地 Ollama prompt，从而实现“规则变更后实时生效”。

## 0.3.2 — 2026-04-03

- **数据安全**：`npm run db:seed:reference` 只补 `CompassQuadrantThreshold`（无则建）与空的 `CompassAlertRule` 首次填充，**不碰**客户/项目/报价/罗盘条目/用户/审计；适合已有丰满数据的环境。
- **备份**：`npm run db:backup` 按 `DATABASE_URL` 复制 SQLite 到 `prisma/backups/`（脚本内加载 `.env`）。
- **警示**：全量 `db:seed` 在清库前会打印警告行，提醒勿对真库执行。

## 0.3.1 — 2026-04-03

- **运维**：`GET /api/health` 探活（可选 `?db=0` 跳过数据库）；session 模式下该路由免登录。
- **安全**：`POST /api/auth/login` 按 IP 进程内限流（`PROFIT_LOGIN_RL_MAX` / `PROFIT_LOGIN_RL_WINDOW_MS`）。
- **发布**：`next.config` 启用 `output: "standalone"`；仓库增加 `Dockerfile`、`.dockerignore`。

## 0.3.0 — 2026-04-03

- **正式登录**：`PROFIT_AUTH_MODE=session` + `PROFIT_AUTH_SECRET` + `NEXT_PUBLIC_PROFIT_AUTH_MODE=session` 时启用邮箱密码登录、JWT HttpOnly Cookie、中间件保护页面与 API；服务端仅从 `x-profit-session-role`（由中间件自 Cookie 注入）解析角色，**忽略** `x-demo-role`。新增 Prisma 模型 `User`（`db push` 仅增表，不破坏既有业务数据）。
- **脚本**：`npm run auth:create-user -- <email> <password> <ROLE>` 创建或更新用户。
- **路由**：`/login`、 `/api/auth/login|logout|session`。

## 0.2.0 — 2026-04-03

- **角色可用性**：工作台按身份引导；项目列表「全部 / 待审批 / 待我处理」与 `?focus=my-queue`；总经理客户/管线只读、CSV 仅管理员；页脚「落地准备」仅可进后台的角色可见。
- **Agent**：按 `x-demo-role` 注入解析语境；各角色 `agentQuickPhrases` 追加话术；提示词版本化与安全策略（见历史提交）。
- **体验**：数据联动事件、Workbench 审计提示对非管理员显示说明而非死链；页脚展示 **v0.2.0**（与 `lib/app-release.ts` / `package.json` 同步）。

## 0.1.0 — 此前基线

- MVP：报价工作台、审批、罗盘、控制台、Ollama 可选、CSV 导入等（见 Git 历史）。
