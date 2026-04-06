# Schema Migration v1.0 — 权限体系止血

**日期：** 2026-04-06
**提交：** `6be9794`
**执行方：** Agent2

---

## 一、变更清单

### 1.1 新增表：Team

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String (cuid) | 主键 |
| name | String | 团队名称 |
| managerId | String | 团队负责人 userId |
| createdAt | DateTime | 创建时间 |

### 1.2 User 表变更

| 字段 | 变更 | 说明 |
|------|------|------|
| teamId | **新增** String? | 关联 Team.id，可为空 |
| role | 枚举扩展 | 新增 `SUPER_ADMIN` |

### 1.3 Project 表变更

| 字段 | 变更 | 说明 |
|------|------|------|
| ownerId | **新增** String, default "legacy_owner" | 数据权限归属 |

### 1.4 Customer 表变更

| 字段 | 变更 | 说明 |
|------|------|------|
| ownerId | **新增** String, default "legacy_owner" | 数据权限归属 |

### 1.5 AgentAuditLog 表变更

| 字段 | 变更 | 说明 |
|------|------|------|
| actorId | **新增** String, default "" | 操作人 userId |
| reason | **新增** String, default "" | 操作原因 |
| beforeJson | **新增** String, default "{}" | 操作前快照 |
| afterJson | **新增** String, default "{}" | 操作后快照 |
| @@index([actorId]) | **新增** | actorId 索引 |

---

## 二、历史数据影响

| 表 | 影响 | 处理 |
|----|------|------|
| Project | 现有记录 ownerId 自动填充 `legacy_owner` | 安全，default 值生效 |
| Customer | 现有记录 ownerId 自动填充 `legacy_owner` | 安全，default 值生效 |
| User | 现有记录 teamId 为 null | 安全，可为空 |
| AgentAuditLog | 现有记录新字段填充 default 值 | 安全 |

**红线：** ownerId 不允许 NULL，已通过 `@default("legacy_owner")` 强制填充。

---

## 三、上线顺序（必须严格遵守）

```
Step 1: 发布新代码到服务器（git pull / cherry-pick）
Step 2: npx prisma generate（生成新 Client）
Step 3: npx prisma db push（创建 Team 表 + 新增字段）
Step 4: npm run build
Step 5: pm2 restart profit-web
Step 6: 验证 GET /api/users 返回 200
Step 7: 验证 /console/user-admin 页面可访问
```

**关键：先发代码再 db push，因为 db push 需要新的 schema.prisma 文件。**

---

## 四、回滚步骤（失败时执行）

```
Step 1: git checkout <上一个稳定SHA>
Step 2: npx prisma generate
Step 3: npm run build
Step 4: pm2 restart profit-web
```

**注意：** db push 创建的新表和字段不需要回滚——它们有 default 值，旧代码不会读到也不会报错。如果必须回滚 schema：

```
Step 5（可选）: 手动删除 Team 表
  sqlite3 prisma/dev.db "DROP TABLE IF EXISTS Team;"
Step 6（可选）: 手动删除新字段
  sqlite3 prisma/dev.db "ALTER TABLE Project DROP COLUMN ownerId;"
  sqlite3 prisma/dev.db "ALTER TABLE Customer DROP COLUMN ownerId;"
```

**SQLite 限制：** ALTER TABLE DROP COLUMN 需要 SQLite 3.35.0+。如果版本不支持，重建表即可。

---

## 五、新增文件清单

| 文件 | 类型 | 说明 |
|------|------|------|
| `lib/rbac.ts` | 核心 | RBAC 权限判定（数据域+路由+操作） |
| `app/api/users/route.ts` | API | 用户列表+创建 |
| `app/api/users/[id]/route.ts` | API | 用户编辑+删除 |
| `app/console/users/page.tsx` | 页面 | 用户管理界面 |

---

**版本：** v1.0 | **状态：** 已实施
