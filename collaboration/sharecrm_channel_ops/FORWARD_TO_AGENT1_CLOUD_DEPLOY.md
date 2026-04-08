# 转发给 Agent1 · 纷享销客海外渠道运营演示原型 → 云端发布协同单

> **用途：** Cursor 已在 open 仓库完成**可交互高保真原型**（API + Web + SQLite）。请 **Agent1** 将该应用发布到约定的云端平台，并回传**可访问 URL**与**验收结果**。  
> **业务定位：** 客户演示 / 真实体验 / 预置与导入数据；**非生产级安全**，上线需 HTTPS、强密钥与访问控制（见下文「红线」）。

---

## 一、交付物清单（真源路径 · 相对仓库根）

| 类型 | 路径 | 说明 |
|------|------|------|
| 后端入口 | `collaboration/sharecrm_channel_ops/api/server.mjs` | Fastify 5；同进程托管 REST API + 静态前端 |
| 依赖 | `collaboration/sharecrm_channel_ops/api/package.json` | `npm install` / `npm start` |
| 前端静态资源 | `collaboration/sharecrm_channel_ops/web/` | `index.html`、`app.js`、`styles.css` |
| 种子数据 | `collaboration/sharecrm_channel_ops/data/seed.json` | **首次空库**启动时自动灌入用户/渠道/情报/预警 |
| 容器构建 | `collaboration/sharecrm_channel_ops/Dockerfile` | 多阶段上下文目录应为 **`collaboration/sharecrm_channel_ops/`**（见第三节） |
| Compose（可选） | `collaboration/sharecrm_channel_ops/docker-compose.yml` | 端口 **8790**，卷挂载持久化 SQLite |
| 运维说明 | `collaboration/sharecrm_channel_ops/README.md` | 环境变量、API 摘要、导入格式 |

**构建上下文注意：** Dockerfile 内 `COPY web`、`COPY data` 相对**构建根目录** `collaboration/sharecrm_channel_ops/`，请勿仅用 `api/` 子目录作为 context，否则找不到 `web/` 与 `data/`。

---

## 二、运行时行为（便于你做路由与健康检查）

1. **监听端口：** 默认 **`8790`**（`PORT` 可覆盖）。  
2. **健康检查：** `GET /v1/health` → JSON：`{ ok: true, service: "sharecrm-channel-ops", ... }`。  
3. **用户入口：** 浏览器访问 **`/`**（静态 `index.html`），前端通过同源路径调用 **`/v1/*`**。  
4. **数据持久化：** SQLite 路径由环境变量 **`SHARECRM_DB_PATH`** 指定；未设置时默认为进程 cwd 下 `api/sharecrm_channel.db`。容器场景**必须**挂卷到 `/data` 并设置 `SHARECRM_DB_PATH=/data/sharecrm_channel.db`（与 `docker-compose.yml` 一致），否则重启丢数。  
5. **首次启动：** 若用户表为空，自动读取 `data/seed.json` 初始化；已有数据则**不会**重复种子。

---

## 三、推荐发布方式（任选其一，按平台惯例）

### 方案 A：Docker（推荐）

```bash
cd collaboration/sharecrm_channel_ops
docker compose up --build -d
```

- 对外映射 **`8790:8790`**（或经网关反代到 443）。  
- 持久化卷：挂载到容器内 **`/data`**，并确保 **`SHARECRM_DB_PATH=/data/sharecrm_channel.db`**。

### 方案 B：裸 Node（VM / 弹性应用）

```bash
cd collaboration/sharecrm_channel_ops/api
npm ci --omit=dev   # 或 npm install --omit=dev
PORT=8790 SHARECRM_DB_PATH=/var/lib/sharecrm/sharecrm_channel.db JWT_SECRET=<强随机> node server.mjs
```

- 需保证工作目录下能通过 `../web`、`../data` 解析到资源（与当前 `server.mjs` 中 `ROOT = join(__dirname, "..")` 一致）；**进程 cwd 建议为 `api/` 目录**，或自行设置等价路径（若改代码需回 PR，优先保持仓库默认结构）。

---

## 四、环境变量（请 Agent1 在云平台配置）

| 变量 | 必填 | 说明 |
|------|------|------|
| `PORT` | 否 | 默认 `8790` |
| `SHARECRM_DB_PATH` | **容器/生产建议必填** | SQLite 文件绝对路径；需持久化卷 |
| `JWT_SECRET` | **生产必填** | HMAC 签名密钥；**禁止使用**仓库默认值；轮换策略按平台规范 |
| `TOKEN_TTL_SEC` | 否 | Token 有效期（秒），默认 7 天 |

**CORS：** 当前为 `origin: true`（便于演示）。若公网开放，建议后续收紧为固定前端域名（需开发小改时可另开任务）。

---

## 五、演示账号（仅用于验收与客户演示）

种子用户（密码均为 **`Demo2026!`**）：

- `admin@sharecrm.demo` — 管理员，可见全部渠道 + **数据导入**  
- `manager@sharecrm.demo` — 总监，同上  
- `sam.zhang@sharecrm.demo` — 销售（东南亚），**仅可见负责渠道**  
- `li.wei@sharecrm.demo` — 销售（中东欧），同上  

**请勿**在对外文档中长期张贴明文密码；客户演示后可改种子或关写入接口（另议）。

---

## 六、发布验收清单（请 Agent1 回传）

1. **公网 URL**（HTTPS 优先）：根路径可打开登录页。  
2. **`GET {origin}/v1/health`** 返回 200 且 `ok: true`。  
3. **登录：** 使用 `admin@sharecrm.demo` / `Demo2026!` 可进入；总览 KPI 有数（渠道数约 8、预警未处理 ≥1）。  
4. **持久化：** 重启容器/进程后，**已写入数据仍在**（若验收时曾改渠道备注或导入数据）。  
5. **（可选）导入：** 管理员在「数据导入」页提交 `{"channels":[...]}` 或上传同结构 JSON，返回 `imported` > 0。  
6. **回传材料：** 最终访问地址、所用部署方式（Docker / 其他）、`JWT_SECRET` 是否已替换（是/否）、Git **commit SHA** 或镜像 tag。

---

## 七、安全与合规红线（云端必做）

- **必须 HTTPS** 终止（网关或负载均衡），禁止长期明文 HTTP 传 Token。  
- **必须更换 `JWT_SECRET`**；仓库默认仅本地演示。  
- 本原型为**演示级**：密码明文存库、无 MFA、无审计日志扩展；**不得**直接当生产 CRM 暴露敏感真实数据。若客户要灌真实数据，需脱敏 + 访问控制 + 法务确认。  
- 数据库文件权限：仅运行用户只读/写，禁止提交到 Git（`api/.gitignore` 已忽略 `sharecrm_channel.db*`）。

---

## 八、与 Cursor 的协同接口

- 若平台**不能**使用 `collaboration/sharecrm_channel_ops` 为构建根目录，请 Agent1 说明限制；Cursor 可补一个「仅从 api 构建」的替代 Dockerfile（需单独提需求）。  
- 若需 **子路径部署**（如 `https://host/sharecrm/`）：当前前端 `fetch` 为根路径 `/v1`，需改 `web/app.js` 的 `apiBase()` 与静态资源 `base` — 请把**目标路径前缀**写给 Cursor 改一版再发版。

---

## 九、给用户 / 产品经理（转发时可附一句）

> Agent1 按上文发布后，请回我 **HTTPS 链接 + health 截图/状态 + 已用强 JWT_SECRET**，我安排业务侧走一遍演示脚本验收。

---

**文档版本：** v1 · 纷享销客海外渠道运营原型 → Agent1 云端发布  
**编写侧：** Cursor（open 仓库 `collaboration/sharecrm_channel_ops/`）
