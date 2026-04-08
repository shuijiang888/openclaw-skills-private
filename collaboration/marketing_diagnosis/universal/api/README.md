# 营销诊断 MVP API

- **契约：** `../API_PAYLOAD_EXAMPLES_v1.md`（`/v1/health`、`/v1/submissions`、`/v1/leads`、**`/v1/stats/daily`**）。
- **存储：** SQLite（`diag_mvp.db`），表 `diag_submission`、`diag_lead`（`lead_kind` CHECK）、**`sync_job`（二期占位）**、**`daily_stat`**（提交/线索时自增）。

## 本地启动

```bash
npm install
PORT=8787 npm start
```

**`GET /v1/stats/daily?from=YYYY-MM-DD&to=YYYY-MM-DD`** — 返回 `daily_stat` 聚合行（运维/看板）。

可选环境变量：

| 变量 | 说明 |
|------|------|
| `PORT` | 默认 `8787` |
| `DIAG_DB_PATH` | 数据库文件路径 |
| `API_KEY` | 若设置，除 `/v1/health` 外需请求头 `X-API-Key` |
| `CORS_ORIGINS` | 逗号分隔；默认 `*` |

## 与 H5 联调

在 `h5_universal.html` 的 `CONFIG` 中设置：

```js
apiBaseUrl: "http://localhost:8787",
```

生产改为 `https://你的 API 域名`（勿带末尾 `/`）。

生产部署请改用 TencentDB + 与 `MVP_SCHEMA_DRAFT.sql` 一致的迁移；本包用于 **今日闭环与门禁自测**。
