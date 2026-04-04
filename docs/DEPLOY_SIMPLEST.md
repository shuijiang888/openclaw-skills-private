# 最简单部署（只记 3 步）

适合不想看长文档的人。**整段复制**，只改**邮箱**和**密码**。

---

## 你要准备什么

- 能 **SSH 登录**腾讯云服务器（网页终端或 PuTTY 等）。
- 用 **root** 或有 **sudo** 的账号（下面命令统一用 `sudo`）。
- 密码里**不要**有英文单引号 `'`。

---

## 第 1 步：进入代码目录并更新代码

（若你还没有代码，先把本仓库 **git clone** 到 `/opt/profit-web`，再执行下面两行。）

```bash
cd /opt/profit-web
sudo git pull
```

---

## 第 2 步：一条命令完成安装（唯一要动脑的地方：改邮箱和密码）

```bash
sudo bash deploy/one-click-setup.sh '你的邮箱@example.com' '你的登录密码'
```

把单引号里的邮箱和密码换成你自己的。**其它一律不要改。**

脚本会自动：备份 Nginx、建数据库、创建管理员、Docker 起盈利系统、放情报占位页、改 Nginx。

---

## 第 3 步：浏览器打开

在电脑浏览器输入（把 IP 换成你的公网 IP，一般是 `119.45.205.137`）：

`http://119.45.205.137/portal`

用**第 2 步**的邮箱和密码登录。  
点「智能情报」会先看到**占位说明**；以后有正式前端，把文件**整个覆盖**到服务器目录 `/usr/share/nginx/html/intel/` 即可。

---

## 打不开时

1. 腾讯云 **安全组** 放行 **80** 端口。  
2. 把第 2 步运行时的**最后 30 行**复制发给别人排查。  
3. 备份路径记在服务器文件：`/root/profit-web-LAST-BACKUP.txt`。

---

更细的说明（回滚、手动步骤）见 **`DEPLOY_BEGINNER_STEP_BY_STEP.md`**。

---

## 更省事：让 GitHub 自动 SSH 部署

配置好 Secrets 后，在 GitHub **Actions** 里点一次 **Run workflow** 即可，不必登录服务器敲命令。见 **`docs/AGENT_CI_DEPLOY.md`**。
