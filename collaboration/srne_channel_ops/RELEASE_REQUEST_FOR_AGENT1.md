# RELEASE REQUEST FOR AGENT1 — SRNE 渠道运营系统

> 目标：请 Agent1 按本文完成 **云端发布 + 子路径接入 + 验收回传**。  
> 应用：硕日海外渠道运营（SRNE Channel Ops）  
> 目录根：`collaboration/srne_channel_ops/`

---

## 1) 发布范围（按版本能力）

本次发布内容覆盖以下三段能力，请确保不是只发布首版：

1. **首版原型**
   - 登录、首页总览、渠道列表/详情、预警、情报、工具等基础能力
2. **第一轮增强**
   - 图表
   - analytics 能力
   - 子路径部署 `/srne`
   - 快捷建渠道
   - 月度补录
3. **第二轮增强**
   - `performance/scorecard`
   - 导入 preview / batches
   - `import_batch`
   - 前端绩效页与导入工作台

---

## 2) 必须同步的文件路径

发布时必须同步以下目录/文件，不可只发 `api/`：

- `collaboration/srne_channel_ops/api/`
- `collaboration/srne_channel_ops/web/`
- `collaboration/srne_channel_ops/data/seed.json`
- `collaboration/srne_channel_ops/Dockerfile`
- `collaboration/srne_channel_ops/docker-compose.yml`

**红线：Docker build context 必须是 `collaboration/srne_channel_ops/` 根目录。**  
否则会缺失 `web/`、`data/`，导致页面或种子数据异常。

---

## 3) 环境与子路径要求

### 必需环境变量

- `SRNE_DB_PATH`：SQLite 数据文件路径（需持久化挂载）
- `JWT_SECRET`：必须替换为强随机值（禁止默认值）
- `PORT`：默认 `8790`
- `TOKEN_TTL_SEC`：可选

### 子路径与反向代理

对外入口要求挂在 `/srne/`，健康检查可通过：

- `GET /srne/v1/health`

反代需保证：

- `/srne/` → 转发到应用根 `/`
- `/srne/v1/` → 转发到应用 `/v1/`
- 保留 `Host / X-Forwarded-*` 头

---

## 4) 发布后验收清单（必须回传结果）

请至少完成并回传以下检查：

1. 健康检查：`/srne/v1/health` 返回 200 + `ok=true`
2. 登录流程可用
3. scorecard 页面可访问并有数据
4. preview / import / batches 流程可达
5. 绩效页可访问（performance）
6. SQLite 持久化生效（重启容器后数据仍在）
7. 回传 **Git SHA 或镜像 tag**

---

## 5) 已知限制（需在回传中说明）

1. **CSV 解析限制**：当前对“带逗号字段”处理能力有限（需注意导入格式）
2. **负责人榜 SQL 限制**：使用 `INNER JOIN`，可能导致无匹配记录不显示

---

## 6) 交叉参考文档

- `collaboration/srne_channel_ops/FORWARD_TO_AGENT1_CLOUD_DEPLOY.md`
- `collaboration/cursor-out/AGENT1_SRNE_INGEST_AND_DEPLOY.md`
- `collaboration/srne_channel_ops/README.md`

---

## 7) 回传格式（建议）

请 Agent1 回传以下信息：

- 部署 URL（含 HTTPS）
- health 结果（响应体片段）
- 当前运行 SHA / 镜像 tag
- JWT_SECRET 是否已替换（是/否）
- 验收清单逐项结果（通过/失败）
- 若失败：阻塞点 + 建议下一步

