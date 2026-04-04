# 腾讯云 CVM（119.45.205.137）部署说明

本仓库无法从 Cursor 云端代你 SSH 登录服务器；由你在 CVM 终端执行命令，代码与脚本在本仓库。

---

## 零、当前线上实况（已与贵方核对）

以下描述**服务器当前状态**，与「仓库内完整系统」区分开。

| 项目 | 现状 |
| --- | --- |
| **对外访问** | `http://119.45.205.137/`（根路径，非子域名；备案前主要用 IP） |
| **运行方式** | **Nginx 静态站点**：`root /usr/share/nginx/html`，**不是** Node / pm2 / Docker 里的应用进程 |
| **Nginx** | 监听 `0.0.0.0:80`（及 `[::]:80`），`default_server`；**443 未配置生产证书路由** |
| **3000 端口** | **当前无**容器或 Node 监听（部署完整盈利系统后，建议本机 `127.0.0.1:3000` + Nginx 反代） |
| **登录 / Cookie** | 当前静态 Demo **无**登录 Cookie |
| **数据库** | 当前静态 Demo **无**数据库依赖 |

**参考配置片段（脱敏，以机上实际文件为准）：**

```nginx
server {
    listen 80 default_server;
    server_name _;
    root /usr/share/nginx/html;
    location / { }
}
```

> 历史备份（如 `00-zhitan-demo.conf.bak`）不生效，勿与 active 配置混淆。

---

## ★ 推荐最优方案（单 IP、单 80 端口、门户可跳转两系统）

目标：**同一** `http://119.45.205.137/` 进入门户（`/portal`），两个卡片分别进入盈利与情报，无混合内容、不写死 IP。

| 路径 | 指向 |
| --- | --- |
| `/` | Nginx **反代** → 盈利 Next 容器 `127.0.0.1:3000`（含 `/portal`、`/dashboard`） |
| `/intel/` | Nginx **静态** → `/usr/share/nginx/html/intel/`（情报前端，须 **`basePath: '/intel'`** 构建） |

**盈利侧（本仓库）**：门户默认 **`NEXT_PUBLIC_PORTAL_APP_INTELLIGENCE_URL=/intel/`**（同域相对路径，卡片为站内跳转）。执行 `deploy/tencent-cvm-profit-docker.sh` 即可。

**情报侧**：在情报工程 `next.config` 增加 `basePath: '/intel'`（必要时 `assetPrefix: '/intel'`），`npm run build` / `output: export` 后，将产物拷到 **`/usr/share/nginx/html/intel/`**（根级须有 `index.html`）。

**Nginx**：用仓库内 **`deploy/nginx-unified-portal.conf`** 替换原「整站静态 `location /`」配置（保留 `listen 80 default_server` 的 server 块，避免两个 default_server 冲突——应**禁用旧 conf** 或合并为一份）。

**上线顺序建议**：① 情报构建并拷到 `html/intel/` → ② 起盈利容器 → ③ 换 Nginx 配置并 `reload` → ④ 浏览器验 `http://IP/portal` 与两卡片。

---

## 一、仓库内「完整」盈利管理系统（本应用）能力

与线上静态页不同，**完整系统**在仓库内支持：

| 方式 | 说明 |
| --- | --- |
| **Docker** | `Dockerfile` 已就绪；构建 `docker build -t profit-web .`；运行需 `DATABASE_URL`、`PROFIT_AUTH_SECRET`、`PROFIT_AUTH_MODE=session`、`NEXT_PUBLIC_PROFIT_AUTH_MODE=session` 等（见 `deploy/tencent-cvm-profit.env.example`） |
| **Node 直跑** | `npm install && npx prisma db push && npm run build && HOSTNAME=0.0.0.0 PORT=3000 npm run start`（Next standalone） |
| **一键脚本** | `deploy/tencent-cvm-profit-docker.sh`（含构建期 `NEXT_PUBLIC_*`、挂载 `prisma`） |

**数据与备份（完整系统）：**

- 默认 SQLite：`DATABASE_URL=file:./prisma/dev.db` 或 `real.db`（生产建议独立 `prod.db`）。
- Docker 须挂载宿主机目录到容器内 **`/app/prisma`**，且与 `DATABASE_URL` 路径一致。
- 备份：`npm run db:backup`，输出到 `prisma/backups/`。

**登录模式：**

- `PROFIT_AUTH_MODE=session` 时为 **同域 Cookie** Session。
- 若未来多域部署：可采用「门户只跳转、各系统各自登录」（当前架构可接受）。

---

## 二、仅上盈利、暂不同机情报（备选）

若短期只有盈利：Nginx 仅 `location / { proxy_pass http://127.0.0.1:3000; ... }` 即可。门户里情报卡片可临时改为绝对 URL（`NEXT_PUBLIC_PORTAL_APP_INTELLIGENCE_URL`），待情报迁到 `/intel/` 后再改回 `/intel/` 并重建镜像。

---

## 三、Nginx 合并配置（与「最优方案」一致）

完整片段见 **`deploy/nginx-unified-portal.conf`**（含 `/intel/` 静态 + `/` 反代）。部署前请备份原 `conf.d` 下 default_server。

---

## 四、与智能情报系统同机统筹（要点）

- 根路径 **`/`** 只能服务一个应用；最优解是 **盈利占 `/`**，**情报占 `/intel/`**（见上文）。
- 情报旧包若为根路径构建，需 **加 basePath 重建** 后再放入 `html/intel/`，否则资源路径会错。

---

## 五、盈利系统：首次部署命令（Docker 路径）

```bash
cd /opt/profit-web   # 按实际路径
cp deploy/tencent-cvm-profit.env.example deploy/tencent-cvm-profit.env
nano deploy/tencent-cvm-profit.env
```

首次建库与管理员（宿主机需 Node，或临时用 `docker run` 执行 prisma）：

```bash
npm ci
set -a && source deploy/tencent-cvm-profit.env && set +a
npx prisma generate
npx prisma db push
npm run auth:create-user -- 'admin@你的域名' '强密码' ADMIN
```

一键构建并运行容器：

```bash
source deploy/tencent-cvm-profit.env
chmod +x deploy/tencent-cvm-profit-docker.sh
./deploy/tencent-cvm-profit-docker.sh
```

---

## 六、验收清单

- [ ] `curl -s http://127.0.0.1:3000/api/health` 正常。
- [ ] `curl -sI http://127.0.0.1:3000/` 在开启 `PROFIT_ROOT_REDIRECT=portal` 时为 **302** 且 `Location` 含 `/portal`。
- [ ] 浏览器访问 `http://119.45.205.137/portal`（或 `/` 自动进门户），两卡片可打开 **工作台** 与 **`/intel/`** 情报首页。
- [ ] 在 CVM 上 `curl -sI http://127.0.0.1/intel/` 经本机 Nginx 返回 **200**（情报静态已就位）。
- [ ] SQLite 已挂载，`npm run db:backup` 在运维流程中可执行。
