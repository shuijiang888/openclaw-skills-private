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

## 二、从「静态根路径」切换到「完整盈利系统」

当前 `location /` 走静态文件；要上线完整 Next 应用，需让 **`/` 反代到上游**（否则会与静态 `root` 冲突）。

**推荐步骤概要：**

1. 备份现有站点：`/usr/share/nginx/html` 与当前 Nginx `conf.d` 下 active 配置。
2. 在服务器拉取本仓库、`git pull` 到含 `/portal` 的版本，配置 `deploy/tencent-cvm-profit.env`。
3. 首次：`npx prisma db push` + `npm run auth:create-user ...`（见下文）。
4. 执行 `./deploy/tencent-cvm-profit-docker.sh`，确认 `curl -s http://127.0.0.1:3000/api/health` 正常。
5. **修改 Nginx**：将 `location /` 从静态改为 `proxy_pass http://127.0.0.1:3000;`（并保留 `Host` / `X-Forwarded-*` 头，见下节）。
6. `nginx -t && systemctl reload nginx`。

**环境变量建议（生产）：**

- `PROFIT_ROOT_REDIRECT=portal`：访问 `/` **302 → `/portal`**（统一门户作首页）。
- `NEXT_PUBLIC_PORTAL_APP_INTELLIGENCE_URL`：与浏览器可打开的**情报系统完整 URL** 一致（见第四节）。

---

## 三、Nginx 反代完整示例（替换原静态 `root`）

```nginx
server {
    listen 80 default_server;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

若需暂时保留部分静态文件，可改用更细 `location` 优先级（例如精确路径 `=` 或前缀），避免与 Next 路由冲突。

---

## 四、与智能情报系统同机统筹

**已核实（贵方）：**

- 情报侧当前亦为**根路径**静态部署思路；`next.config` **无** `basePath` / `assetPrefix`（与盈利侧一致）。
- 若情报需挂 **`/intel/`**：须在情报工程内配置 **`basePath: '/intel'`**（必要时 **`assetPrefix`**），并**重建发布**；Nginx 增加 `location /intel/` 指向静态目录或上游。

**根路径冲突说明：**

- `http://119.45.205.137/` **只能有一个**默认内容：要么整站反代盈利，要么整站静态。
- **推荐合并形态**：Nginx `location /` → 盈利（`127.0.0.1:3000`），`location /intel/` → 情报静态或情报上游；门户内 `NEXT_PUBLIC_PORTAL_APP_INTELLIGENCE_URL=http://119.45.205.137/intel/`（末尾斜杠与情报 `basePath` 对齐），并**重建盈利镜像**。

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
- [ ] 经 Nginx 访问对外 IP 的 `/portal`，两系统入口可点通。
- [ ] SQLite 已挂载，`npm run db:backup` 在运维流程中可执行。

---

## 七、给情报侧后续补充（若走 `/intel/`）

- 情报构建产物部署目录路径（例如 `/usr/share/nginx/html/intel/`）。
- 是否使用 Docker 及容器端口（若由 Nginx `proxy_pass` 而非纯静态）。
