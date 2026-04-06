# 智探007监控与告警清单（P2）

## 关键接口（每5分钟）
- `GET /api/zt/monitoring`（聚合探针 + 一致性 + 告警结论）
- `GET /api/zt/monitoring/history?limit=24`（趋势历史 + 状态分布）
- `GET /api/zt/overview`
- `GET /api/zt/action-cards`
- `GET /api/zt/bounty-tasks`
- `GET /api/zt/submissions/recent`
- `GET /api/zt/redemptions`

## 告警阈值建议
- 可用率 < 99%（5分钟窗口）：报警
- 95分位延迟 > 1500ms：预警
- 5xx 比例 > 1%：报警

## 业务一致性巡检（每小时）
- 最近 1 小时 `ztSubmission` 新增数 vs `ztPointLedger(action=SUBMISSION_APPROVED)` 数量差异 > 0 触发告警
- 最近 1 小时兑换申请 `ztRedemption` 数量 vs `ztPointLedger(action=REDEEM_REQUEST)` 数量差异 > 0 触发告警
- 积分钱包负数检查：`ztPointWallet.points < 0` 出现即报警

## 发布后巡检（手工）
1. 执行：`scripts/release-preflight.sh`
2. 执行：`scripts/zt-acceptance.sh`
3. 打开：`/health-check`，确认智探模块全部通过

## 自动化命令
- `npm run release:preflight`
- `npm run zt:acceptance`

## P2 第二批（可观测性增强）
- 监控快照会落盘到 `agentAuditLog(action=zt_monitoring_snapshot)`，用于趋势回放。
- 告警通知支持 webhook 占位开关：
  - 环境变量：`ZT_MONITORING_ALERT_WEBHOOK_URL`
  - 未配置时仅本地告警展示，不外发。
- 同类告警 5 分钟内自动节流（按 scope + status + alerts fingerprint）。

