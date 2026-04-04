# 更自动化的发布（GitHub Actions → 腾讯云）

适合：**不想在 SSH 里敲命令**，由 Agent 或你在 GitHub 点一次按钮完成部署。

## 原理

GitHub Actions 使用你配置的 **SSH 私钥** 登录 CVM，在固定目录执行：

`git pull` → `sudo bash deploy/one-click-setup.sh '邮箱' '密码'`

与手动执行同一套脚本，行为一致。

## 一次性准备（人或 Agent 在 GitHub + 服务器各做一次）

### 1. 服务器

- 已 **clone** 本仓库到 **`/opt/profit-web`**（或记下路径，填进 Secret `TENCENT_DEPLOY_PATH`）。
- 部署用户能 **`sudo`** 且无密码（或配置好 NOPASSWD），否则 `one-click-setup.sh` 会卡在 sudo。
- 已安装 **Docker**、**Nginx**（与一键脚本要求相同）。

### 2. 部署用 SSH 密钥（推荐专用一对）

在**你电脑或服务器**生成（示例）：

```bash
ssh-keygen -t ed25519 -f ./tencent-deploy -N "" -C "github-actions-profit"
cat tencent-deploy.pub >> ~/.ssh/authorized_keys   # 在 CVM 上执行，把公钥追加给登录用户
```

把 **私钥** `tencent-deploy` 的**全文**放进 GitHub Secret **`TENCENT_SSH_KEY`**。

### 3. GitHub 仓库 Secrets

| Secret | 说明 |
| --- | --- |
| `TENCENT_HOST` | `119.45.205.137` |
| `TENCENT_USER` | `root` 或 `ubuntu` 等 |
| `TENCENT_SSH_KEY` | 私钥全文 |
| `PROFIT_ADMIN_EMAIL` | 管理员邮箱 |
| `PROFIT_ADMIN_PASSWORD` | 密码（勿含 `'`） |
| `TENCENT_DEPLOY_PATH` | 可选，默认 `/opt/profit-web` |

## 如何触发

1. 打开 GitHub 仓库 → **Actions** → **Tencent CVM deploy** → **Run workflow**  
2. **branch**：填要部署的分支（须已 `git push`）  
3. **confirm**：必须填 **`deploy`**（防误触）  
4. 查看运行日志；失败时日志即排查依据。

## Agent 可代劳的部分

- 在本仓库维护 `deploy/one-click-setup.sh` 与 workflow 文件。  
- 指导人类在 GitHub / 腾讯云完成 **Secrets 与 SSH 公钥**（Agent 无法代填 GitHub Secret 或登录你的云账号）。

## 安全提示

- `PROFIT_ADMIN_PASSWORD` 会出现在 Actions 日志的远程命令行中（已用 `printf %q` 转义）；生产建议专用弱业务密码或部署后立刻改密。  
- 私钥仅放 GitHub Secrets，不要提交进仓库。
