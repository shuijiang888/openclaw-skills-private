# AGENTS.md

## Cursor Cloud 专用说明

本仓库（`openclaw-skills-private`）是"**盈利管理系统 Web**"（一期 MVP · 产品试点版），技术栈为 **Next.js 16 (App Router) + Prisma 5 + SQLite + Tailwind CSS 4**。

### 开发环境搭建

标准命令见 `README.md`"本地运行"一节。简要流程：

```bash
npm install
npx prisma db push
npm run db:seed          # 仅空库；已有业务数据改用 npm run db:seed:reference
npm run dev              # 开发服务器 → http://127.0.0.1:3000
```

环境变量：复制 `.env.example` 为 `.env`，默认使用 `DATABASE_URL="file:./prisma/dev.db"` 即可。

### 常用命令速查

| 命令 | 用途 |
|------|------|
| `npm run dev` | 启动开发服务器（端口 3000） |
| `npm run build` | 构建（含 `prisma generate`） |
| `npm run lint` | ESLint 检查 |
| `npm run db:push` | 同步 Prisma schema 到 SQLite |
| `npm run db:seed` | 全量种子数据（**会清空业务数据**） |
| `npm run db:seed:reference` | 仅补罗盘阈值和对策规则（安全） |
| `npm run db:backup` | 备份 SQLite 到 `prisma/backups/` |
| `npm run auth:create-user` | 创建登录账号 |

### 注意事项

- **身份模式**：默认为"演示模式"（右上角切换试点角色），设置 `PROFIT_AUTH_MODE=session` 后切换为"登录模式"。
- **Lint 已知问题**：现有代码中有 4 个 `react-hooks/set-state-in-effect` 错误和 2 个 warning，均为已有代码问题，不影响运行。
- **无自动化测试**：仓库当前没有测试框架和测试文件。
- **Prisma 版本**：当前锁定 5.22.0，升级需谨慎（会提示可升到 7.x）。
- **Next.js middleware 警告**：构建时会提示 `middleware` 文件约定已废弃，建议未来迁移到 `proxy`，但当前不影响功能。
- **热重载**：`npm run dev` 支持热重载。修改 `prisma/schema.prisma` 后需重新运行 `npx prisma db push` 和 `npx prisma generate`，然后重启开发服务器。
- **Ollama（可选）**：报价智能助手需要本地 Ollama 服务，未启用时自动回退规则引擎，不影响基本功能。
