# 腾讯云 CVM（119.45.205.137）部署说明

本仓库无法从 Cursor 云端代你 SSH 登录服务器；流程与「智能情报系统」Agent 的做法一致：**你在 CVM 终端执行命令**，代码与脚本由本仓库提供。

## 你需要具备的条件

- CVM 已安装 **Docker**（`docker build` / `docker run`）。
- 安全组放行 **80 / 443**（若直接暴露 `3000` 则一并放行）。
- 本仓库代码已在服务器某目录（例如 `/opt/profit-web`），`git pull` 到含 `/portal` 的版本。

## 一、制造业盈利管理系统（本应用）

### 1. 准备 SQLite 与管理员（仅首次）

```bash
cd /opt/profit-web   # 按你的实际路径
cp deploy/tencent-cvm-profit.env.example deploy/tencent-cvm-profit.env
nano deploy/tencent-cvm-profit.env   # 填写 PROFIT_AUTH_SECRET、DATABASE_URL 等
```

首次建库与管理员（在**宿主机** Node 环境执行，非容器内亦可）：

```bash
npm ci
export $(grep -v '^#' deploy/tencent-cvm-profit.env | xargs)
npx prisma generate
npx prisma db push
npm run auth:create-user -- 'admin@你的域名' '强密码' ADMIN
```

### 2. 一键 Docker 构建与运行

```bash
source deploy/tencent-cvm-profit.env
chmod +x deploy/tencent-cvm-profit-docker.sh
./deploy/tencent-cvm-profit-docker.sh
```

脚本会：

- 用 `NEXT_PUBLIC_*` **构建镜像**（门户外链地址写进前端）。
- 运行容器并挂载 `./prisma`，设置 `PROFIT_ROOT_REDIRECT=portal`（访问 `/` → `/portal`）。

### 3. Nginx 反代（推荐）

将 80/443 指向上游 `127.0.0.1:3000`（或你在 `HOST_PORT` 中改的端口）。示例：

```nginx
server {
    listen 80;
    server_name 119.45.205.137;
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

若 **80 端口已被智能情报系统占用**，需二选一：

- **合并入口**：由 Nginx 统一监听 80，`/` 反代盈利（同上），`/intel/`（示例）反代情报系统；并把 `NEXT_PUBLIC_PORTAL_APP_INTELLIGENCE_URL` 设为 `http://119.45.205.137/intel/` 后**重新构建镜像**。
- **分端口**：盈利映射 `3000` 仅内网 + Nginx 子路径或子域名；情报保持现状。

## 二、与智能情报系统同机共存（常见）

1. 情报系统继续由原有进程监听（例如 `127.0.0.1:8081`）。
2. Nginx：`location /intel/` → `http://127.0.0.1:8081/`（具体以情报 Agent 文档为准）。
3. 盈利 `tencent-cvm-profit.env` 中：

   `NEXT_PUBLIC_PORTAL_APP_INTELLIGENCE_URL=http://119.45.205.137/intel/`

4. 重新执行 `./deploy/tencent-cvm-profit-docker.sh` 以重建镜像。

## 三、验收

- `curl -sI http://127.0.0.1:3000/` 应 **302** 到 `/portal`（若开启 `PROFIT_ROOT_REDIRECT=portal`）。
- 浏览器打开对外地址 `/portal`，两个系统入口可点通。
- `GET /api/health` 返回正常。

## 四、给「智能情报系统」Agent 的协作要点

请其在同一台机上明确：**监听地址与 URL 路径**（例如 `127.0.0.1:8081` + Nginx `/intel/`）。盈利侧仅依赖 `NEXT_PUBLIC_PORTAL_APP_INTELLIGENCE_URL` 与 Nginx 配置一致。
