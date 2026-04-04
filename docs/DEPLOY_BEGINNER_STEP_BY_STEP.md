# 小白按步部署（119.45.205.137 · 门户 + 盈利 + 情报）

本文按**固定顺序**写，请**不要跳步、不要颠倒**。每一步都有**成功标准**；不达标就**停下**，不要改 Nginx（避免网站全挂）。最后有**回滚**说明。

---

## 事前约定

- 你用 **SSH** 登录腾讯云服务器（网页「登录」或 `ssh root@119.45.205.137`，以你实际账号为准）。
- 文中 **`sudo`**：若你已是 `root`，可把 `sudo` 去掉。
- 盈利项目代码目录下面写作 **`/opt/profit-web`**；若你放在别处，请全程替换为你的路径。

---

## 阶段 0：只做备份（5 分钟，零风险）

**目的**：后面任何一步出问题，都能一键恢复。

在 SSH 里逐段执行（整段复制即可）：

```bash
sudo mkdir -p /root/nginx-backup-$(date +%Y%m%d)
sudo cp -a /etc/nginx /root/nginx-backup-$(date +%Y%m%d)/nginx-etc
sudo cp -a /usr/share/nginx/html /root/nginx-backup-$(date +%Y%m%d)/html
echo "备份完成，目录：/root/nginx-backup-$(date +%Y%m%d)"
```

**成功标准**：最后一行打印「备份完成」，且没有 `cp: cannot stat` 之类报错。

---

## 阶段 1：检查 Docker（2 分钟）

```bash
docker --version
```

**成功标准**：显示 `Docker version ...`。

**若没有 Docker**：在腾讯云用官方文档安装「Docker CE」后再继续（不要先动 Nginx）。

---

## 阶段 2：部署盈利系统（本仓库）— 先让 3000 端口可用

> **重要**：在改 Nginx 之前，必须先完成本阶段。否则一改 Nginx，网站会 **502**（因为后面要反代到 3000）。

### 2.1 拉代码

```bash
sudo mkdir -p /opt/profit-web
sudo chown -R "$USER":"$USER" /opt/profit-web
cd /opt/profit-web
```

若目录里还没有代码，用 `git clone` 你的仓库地址到 `/opt/profit-web`；若已有则：

```bash
git pull
```

### 2.2 准备环境变量文件

```bash
cd /opt/profit-web
cp deploy/tencent-cvm-profit.env.example deploy/tencent-cvm-profit.env
nano deploy/tencent-cvm-profit.env
```

在 `nano` 里**至少改这两行**（其它保持示例即可）：

- `PROFIT_AUTH_SECRET=` 改成 **至少 16 位乱码**（英文字母数字混合即可）。
- `DATABASE_URL="file:./prisma/prod.db"` 保持即可（首次会自动建库）。

按 `Ctrl+O` 回车保存，`Ctrl+X` 退出。

**避免乱码**：若在 Windows 编辑过该文件，上传到 Linux 后执行一次：

```bash
sed -i 's/\r$//' deploy/tencent-cvm-profit.env
```

### 2.3 首次：数据库 + 管理员账号（仅第一次做）

```bash
cd /opt/profit-web
npm ci
set -a
source deploy/tencent-cvm-profit.env
set +a
npx prisma generate
npx prisma db push
npm run auth:create-user -- '你的邮箱@example.com' '你的登录密码' ADMIN
```

**成功标准**：最后显示用户创建成功；没有红色 `Error`。

若报 `command not found: npm`，先安装 Node.js 20+（腾讯云一键包或 nvm），再重做本小节。

### 2.4 启动 Docker 容器

```bash
cd /opt/profit-web
source deploy/tencent-cvm-profit.env
chmod +x deploy/tencent-cvm-profit-docker.sh
./deploy/tencent-cvm-profit-docker.sh
```

**成功标准**：脚本末尾有 `完成`。再执行：

```bash
curl -s http://127.0.0.1:3000/api/health
```

应返回一段 JSON 或至少不是 `Connection refused`。

再执行：

```bash
curl -sI http://127.0.0.1:3000/ | head -5
```

若配置了 `PROFIT_ROOT_REDIRECT=portal`，应看到 **`302`** 且带有 **`/portal`**。

**本阶段结束前不要改 Nginx。** 外网仍可能是旧静态页，属正常。

---

## 阶段 3：准备情报目录 `/intel/`（避免空白）

> **顺序**：必须在阶段 2 之后、阶段 4（改 Nginx）之前做。这样 Nginx 一切换，`/intel/` 立刻有页面，不会「点门户进情报是 404」。

```bash
sudo mkdir -p /usr/share/nginx/html/intel
sudo cp /opt/profit-web/deploy/intel-placeholder.html /usr/share/nginx/html/intel/index.html
sudo chown -R root:root /usr/share/nginx/html/intel
```

**成功标准**：

```bash
curl -sI http://127.0.0.1/intel/
```

此时**可能还是 404**（因为还没改 Nginx），**没关系**。只要确认文件存在：

```bash
test -f /usr/share/nginx/html/intel/index.html && echo "情报占位文件 OK"
```

应打印 `情报占位文件 OK`。

**以后**：情报正式前端构建好后，用正式包**覆盖**整个 `/usr/share/nginx/html/intel/`（必须仍有 `index.html`），无需再改盈利镜像。

---

## 阶段 4：切换 Nginx（关键一步 · 有回滚）

### 4.1 找出原来的 default 配置

```bash
grep -r "default_server" /etc/nginx/ 2>/dev/null | grep -v ".bak"
```

记下含有 `listen 80 default_server` 的那个文件路径（例如 `/etc/nginx/conf.d/default.conf`）。

### 4.2 禁用旧配置（不要删除，先改名）

```bash
# 把下面路径改成你上一步看到的实际文件
sudo mv /etc/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf.disabled-before-unified
```

若 `default_server` 在别的文件名里，同样 `mv` 成 `.disabled-before-unified`。

### 4.3 安装新配置

```bash
sudo cp /opt/profit-web/deploy/nginx-unified-portal.conf /etc/nginx/conf.d/99-unified-portal.conf
```

### 4.4 若 `nginx -t` 报错 `[::]:80`

少数系统未开 IPv6。编辑新文件，删掉两行带 `[::]:80` 的 `listen`，保存后再测：

```bash
sudo nano /etc/nginx/conf.d/99-unified-portal.conf
sudo nginx -t
```

**成功标准**：`nginx: configuration file ... test is successful`

### 4.5 生效

```bash
sudo systemctl reload nginx
```

**成功标准**：

```bash
curl -sI http://127.0.0.1/ | head -3
curl -sI http://127.0.0.1/intel/ | head -3
```

- 访问 `/`：应 **不是** `Connection refused`（多为 **302** 或 **200**）。
- 访问 `/intel/`：应为 **200**。

再在**你自己电脑浏览器**打开：`http://119.45.205.137/portal`  
应出现门户；点「智能情报」应看到占位说明页；点「制造业盈利」应进入系统（可能要登录）。

---

## 阶段 5：腾讯云安全组（外网打不开时再做）

在腾讯云控制台 → 云服务器 → 安全组 → 入站：**放行 TCP 80**。  
不要用 3000 对外（生产只走 80 即可）。

---

## 若搞砸了：回滚（恢复备份）

**症状**：全站 502、白屏、nginx -t 失败。

```bash
sudo rm -f /etc/nginx/conf.d/99-unified-portal.conf
sudo mv /etc/nginx/conf.d/default.conf.disabled-before-unified /etc/nginx/conf.d/default.conf
# 若你当时改的文件名不同，把 .disabled 文件改回原名即可

docker rm -f profit-web 2>/dev/null || true
sudo cp -a /root/nginx-backup-YYYYMMDD/html /usr/share/nginx/html
# 把 YYYYMMDD 换成你阶段 0 备份文件夹的真实名字

sudo nginx -t && sudo systemctl reload nginx
```

网站会回到**改之前**的静态状态；盈利容器停了，需要时再按阶段 2.4 启动。

---

## 常见「死循环」怎么避免

| 错误做法 | 后果 |
| --- | --- |
| 先改 Nginx 再起 Docker | 全站 **502** |
| 没有 `/usr/share/nginx/html/intel/index.html` 就切换 Nginx | 门户点情报 **404** |
| 两个文件都 `listen 80 default_server` | `nginx -t` **失败** |
| 情报没用 `basePath: '/intel'` 就拷贝到 `/intel/` | 页面白屏、资源 404（需情报项目重建） |

---

## 正式情报包上线（以后单独做）

1. 在情报项目加 `basePath: '/intel'`（及需要的 `assetPrefix`），重新 build。  
2. **备份**当前 `sudo cp -a /usr/share/nginx/html/intel /root/intel-backup`  
3. 把新构建文件**全部覆盖**进 `/usr/share/nginx/html/intel/`  
4. `curl -sI http://127.0.0.1/intel/` 仍为 200 即可，**不用**重建盈利 Docker。

---

更技术细节见同目录 **`TENCENT_CVM_DEPLOY.md`**。
