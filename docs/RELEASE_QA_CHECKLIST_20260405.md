# 发布与验收清单（2026-04-05）

目标：支撑“从昨天到今天”交付成果的一页一页测试，保证可用性与系统隔离。

## 一、发布结论（当前）

- 发布分支：`cursor/agent-2fd9`
- 已推送提交：
  - `d3578cd`（dashboard 稳定性加固）
  - `14842c6`（projects 页面降级容错）
- 公网验证（`http://119.45.205.137/profit`）：
  - `200` `/`
  - `200` `/health-check`
  - `200` `/dashboard`
  - `200` `/projects`
  - `200` `/projects/new`
  - `200` `/compass`
  - `200` `/console` `/console/pipeline` `/console/customers` `/console/system` `/console/users`
  - `200` `/zt007` `/zt007/action` `/zt007/bounty` `/zt007/honor`
  - `200` `/personal`
  - `307` `/zt007/me` -> `/personal`（预期）
  - `307` `/zt007/workbench` -> `/personal`（预期）

## 二、下午逐页验收顺序（建议）

1. 门户与导航隔离
   - `/`
   - `/zt007`
   - 检查页眉、菜单、页脚、右上角色在两套系统是否串台。
2. 盈利系统核心流程
   - `/dashboard`
   - `/projects`
   - `/projects/new`
   - `/projects/{id}`（任选1个项目）
   - `/compass`
3. 智探007核心流程
   - `/zt007/action`：行动卡完成闭环
   - `/zt007/bounty`：提交情报
   - `/zt007/honor`：积分与兑换
   - `/personal`：个人档案与积分展示
4. 管理后台
   - `/console/system`
   - `/console/users`
   - `/console/zt-system`
   - `/console/zt-users`
5. 健康与回归
   - `/health-check` 一键复检

## 三、关键验收点（必须确认）

- 系统隔离
  - 盈利系统页面不出现智探007导航与文案。
  - 智探007页面不出现盈利系统角色与菜单。
- 角色逻辑
  - 右上角角色切换后，页面内容与可操作项随角色变化。
- 交互可用
  - 行动卡可完成、悬赏可提交、积分可兑换申请。
- 容错体验
  - 若后端数据异常，页面展示降级提示而不是 500 白屏。

## 四、自动发布说明（0 手工）

当前链路已打通：`git push root@119.45.205.137:/root/profit-web.git <branch>:main`

远端自动执行：

1. checkout 到 `/opt/profit-web`
2. 安装依赖
3. 构建
4. 重启 PM2 `profit-web`
5. 健康检查输出

> 说明：远端运行目录目前存在历史分支工作树与 main 的并存状态，后续建议做一次目录收敛（仅保留 main 工作树）以减少配置漂移风险。

