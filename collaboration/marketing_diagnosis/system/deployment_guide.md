# 腾讯云部署指南（营销诊断系统）

> **目标主机：** `119.45.205.137`（示例；以实际为准）  
> **入口：** 门户首页卡片 → `/diag/`（Nginx 反代）  
> **非目标：** 本文不执行真实部署，仅供 Agent1/2 按步骤实施。

---

## 1. 服务器准备

### 1.1 系统与权限

- Ubuntu 22.04 LTS 或兼容版本  
- 创建部署用户 `deploy`，加入 `sudo`（或最小权限 + systemd）  
- 防火墙：**80/443** 对公网；**5432/6379** 仅内网

### 1.2 安装 PostgreSQL

```bash
sudo apt-get update
sudo apt-get install -y postgresql postgresql-contrib
sudo -u postgres psql -c "CREATE DATABASE marketing_diag;"
sudo -u postgres psql -c "CREATE USER diag_user WITH ENCRYPTED PASSWORD 'your_strong_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE marketing_diag TO diag_user;"
sudo -u postgres psql -d marketing_diag -c "GRANT ALL ON SCHEMA public TO diag_user;"
```

启用扩展（若使用 `gen_random_uuid()`）：

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

### 1.3 安装 Redis

```bash
sudo apt-get install -y redis-server
sudo sed -i 's/^supervised no/supervised systemd/' /etc/redis/redis.conf
sudo systemctl enable redis-server
sudo systemctl restart redis-server
```

### 1.4 Node.js 18+

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 1.5 代码与依赖

```bash
sudo mkdir -p /opt/marketing-diag
sudo chown deploy:deploy /opt/marketing-diag
cd /opt/marketing-diag
git clone <repo_url> .
cd api && npm ci
npx prisma migrate deploy
npx prisma db seed   # 初始化默认 campaign（需实现 seed）
npm run build
```

---

## 2. 环境变量（`.env`）

```bash
DATABASE_URL=postgresql://diag_user:password@127.0.0.1:5432/marketing_diag
REDIS_URL=redis://127.0.0.1:6379
FXIAOKE_APP_ID=your_app_id
FXIAOKE_APP_SECRET=your_app_secret
FXIAOKE_API_BASE=https://open.fxiaoke.com
JWT_SECRET=your_long_random_secret
PUBLIC_BASE_URL=https://your-domain.com/diag
UPLOAD_DIR=/opt/marketing-diag/uploads
NODE_ENV=production
PORT=3090
```

> 生产建议用 **腾讯云 SSM / 密钥管理** 注入，勿将 `.env` 提交仓库。

---

## 3. Nginx 配置

文件示例：`/etc/nginx/sites-available/diag.conf`

```nginx
server {
    listen 80;
    server_name 119.45.205.137;

    location /diag/ {
        proxy_pass http://127.0.0.1:3090/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /diag/uploads/ {
        alias /opt/marketing-diag/uploads/;
        expires 7d;
        add_header Cache-Control "public";
    }
}
```

```bash
sudo ln -sf /etc/nginx/sites-available/diag.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

**HTTPS：** 建议用腾讯云 SSL 证书绑定 443，`location` 同上。

> 若 `proxy_pass` 保留 `/diag` 前缀转发到 Node，需 **二选一**：要么 Nginx 去掉前缀（如上），要么 Fastify 挂 `prefix: '/diag'`。**全团队统一一种。**

---

## 4. PM2

`/opt/marketing-diag/pm2.config.js`：

```javascript
module.exports = {
  apps: [{
    name: 'marketing-diag',
    script: 'dist/index.js',
    cwd: '/opt/marketing-diag/api',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3090
    }
  }]
};
```

```bash
cd /opt/marketing-diag && pm2 start pm2.config.js
pm2 save
pm2 startup
```

**Worker 进程（可选）：** 单独 `marketing-diag-worker` 只跑 Bull consumer，避免阻塞 HTTP。

---

## 5. 发布流程

```bash
cd /opt/marketing-diag && git pull
cd api && npm ci && npm run build
npx prisma migrate deploy
pm2 restart marketing-diag
# 若有 worker：pm2 restart marketing-diag-worker
curl -sS http://127.0.0.1:3090/api/v1/health
```

---

## 6. 发布门禁清单（每次必查）

- [ ] `prisma migrate deploy` 已在目标库执行且无漂移  
- [ ] `.env` / 密钥已更新且非明文入库  
- [ ] 纷享 API 凭证有效（可调用测试接口）  
- [ ] Nginx `nginx -t` 通过且已 reload  
- [ ] PM2 进程 online，`/api/v1/health` 返回 200  
- [ ] `/diag/uploads/` 目录权限 `deploy` 可写  
- [ ] 问卷提交限流 / 验证码（若已启用）已打开  
- [ ] 门户首页卡片链接指向正确 `campaign` 与 `utm` 参数  

---

## 7. 与门户集成

- 门户卡片：`/diag/index.html` 或 SPA 路由，静态资源可放 COS + CDN，API 仍回源 `119.45.205.137`。  
- 统一 **CORS**：若 H5 与 API 不同域，在 Fastify 配置允许门户域。

---

## 8. 监控与日志

- PM2 log rotate  
- 可选：腾讯云 CLS / 文件 `winston` JSON 日志  
- 告警：CRM 同步失败率、PDF 失败率、队列堆积长度
