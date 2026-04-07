# AGENT1 发布直观清单（1~5）+ 回传模板（已填）

> 应用：硕日海外渠道运营（SRNE）  
> 路径：`collaboration/srne_channel_ops/`  
> 执行日期：2026-04-08（UTC+8）

---

## 第一步：确认发布源与同步范围

- [x] 已确认发布根目录：`collaboration/srne_channel_ops/`
- [x] 已确认同步范围包含：
  - `api/`
  - `web/`
  - `data/seed.json`
  - `Dockerfile`
  - `docker-compose.yml`
- [x] 已确认 build context 必须使用 `srne_channel_ops/` 根目录

执行记录（摘要）：
- 当前线上容器镜像：`srne_channel_ops-srne-channel-ops:latest`
- 运行容器：`srne_channel_ops-srne-channel-ops-1`（端口 `8790`）

---

## 第二步：按 Docker 方式部署并拉起服务

- [x] 使用 `docker compose` 构建并启动
- [x] 使用子路径 `/srne/` 对外访问
- [x] 反代健康检查 `/srne/v1/health` 可达

执行记录（摘要）：
- 入口页：`http://119.45.205.137/srne/` -> `200`
- 健康检查：`http://119.45.205.137/srne/v1/health` -> `200`，`ok=true`

---

## 第三步：鉴权与核心接口冒烟

- [x] 登录可用：`POST /srne/v1/auth/login`
- [x] 总览可用：`GET /srne/v1/dashboard/summary`
- [x] 绩效汇总可用：`GET /srne/v1/performance/summary`
- [x] 导入接口可用：`POST /srne/v1/import/channels`

执行记录（摘要）：
- 登录账号：`admin@srne.demo / Demo2026!` -> `200`
- 导入示例：`channel_code=SRNE-SEA-998` -> `{"imported":1,"errors":[]}`

---

## 第四步：持久化验证（重启后数据不丢）

- [x] 重启容器：`docker compose restart srne-channel-ops`
- [x] 重启后查询导入数据仍在：`GET /srne/v1/channels?q=SRNE-SEA-998` -> 命中 1 条

结论：
- SQLite 持久化有效（容器重启后数据保留）

---

## 第五步：回传模板（已填写）

### A. 基本信息

- 部署 URL：`http://119.45.205.137/srne/`
- Health URL：`http://119.45.205.137/srne/v1/health`
- Health 结果：`200` / `{"ok":true,"service":"srne-channel-ops",...}`
- 部署方式：Docker Compose（build context = `collaboration/srne_channel_ops/`）

### B. 安全项

- `JWT_SECRET` 是否替换：**是**（已生成随机值写入运行环境）
- `SRNE_DB_PATH` 持久化：**是**（容器内 `/data/srne_channel.db`，重启后验证通过）

### C. 版本信息

- 仓库分支最新提交（当前工作分支）：`006f00a`
- 当前 SRNE 容器镜像 ID：`ed187b2f8386`

### D. 验收结果（按功能）

- `/srne/` 入口：**通过**
- `/srne/v1/health`：**通过**
- 登录与总览：**通过**
- `performance/summary`：**通过**
- `import/channels`：**通过**
- 持久化重启验证：**通过**

### E. 未闭环项 / 阻塞

以下接口在当前代码中不存在（返回 404），属于“第二轮能力未并入当前构建”：

- `GET /srne/v1/performance/scorecard` -> 404
- `GET /srne/v1/import/batches` -> 404

说明：
- 当前仓库 `api/server.mjs` 暴露的是 `performance/summary`、`import/channels`、`import/channels/upload`；
- 若目标必须包含 `scorecard / batches / import_batch / preview`，需先合入对应代码后再发版。

---

## 备注

- 本文为“按 1~5 步执行并回填模板”的落地记录，可直接转发。
