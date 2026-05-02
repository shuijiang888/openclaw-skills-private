# OpenClaw · 家庭全能助手升级包（与 Hermes 隔离）

本目录提供 **可复制到本机 `~/.openclaw/`** 的配置与工作区引导文件，用于强化：**持久记忆、知识检索习惯、外网/MCP、压缩前落盘**，且不占用 Hermes 所占端口。

## 端口与进程隔离（不要动 Hermes）

| 服务 | 典型端口 | 说明 |
|------|-----------|------|
| Hermes | **18800**（你当前环境） | 请勿在本仓库模板中把 OpenClaw 的浏览器 CDP 设为 18800 |
| OpenClaw Gateway | **18798**（模板默认，可用 `OPENCLAW_GATEWAY_PORT` 覆盖） | HTTP + WebSocket 统一端口 |
| OpenClaw 浏览器自动化 CDP | **18802**（模板默认） | 与 Hermes 错开；若冲突可改为 18803 等 |

修改配置后执行：`openclaw gateway restart`。

## 一次性落地步骤（Mac）

### 方式 A：一键安装（本仓库已含可直接覆盖的 `openclaw.json`）

在**已 clone 本仓库**的机器上，于仓库根目录执行：

```bash
bash openclaw/install-to-home.sh
```

脚本会：备份已有 `~/.openclaw/openclaw.json`，写入本包的 **`openclaw/openclaw.json`**；若工作区尚无引导文件，则从 `workspace-bootstrap/` 复制 `AGENTS.md`、`USER.md`、`MEMORY.md`、`HEARTBEAT.md`。

若你原先在 `openclaw.json` 里配置了 **`gateway.auth`**、**channels**（Telegram 等），备份文件为 `openclaw.json.bak.<时间戳>`，请把对应块 **手动合并回** 新的 `~/.openclaw/openclaw.json`。

### 方式 B：手动合并

1. **备份**：`cp ~/.openclaw/openclaw.json ~/.openclaw/openclaw.json.bak.$(date +%Y%m%d)`
2. 将 `openclaw.json` 或 `openclaw.home-assistant.json5` 的内容按需合并进 `~/.openclaw/openclaw.json`。
3. **校验**：`openclaw doctor --fix`
4. **工作区**：将 `workspace-bootstrap/` 复制到 `~/.openclaw/workspace/`（至少 `AGENTS.md`、`USER.md`；建议含 `MEMORY.md`、`HEARTBEAT.md`）。
5. **Embedding（记忆检索）**：主对话为 MiniMax 时，**向量记忆**仍须单独配置 embedding（本包默认 `openai` + `text-embedding-3-small`）。无 OpenAI 密钥请改为 `gemini` / `ollama` 等并调整 `models.providers`（见 [OpenClaw Memory 文档](https://docs.openclaw.ai/reference/memory-config)）。
6. **重建索引**：`openclaw memory index --force --agent main`（以本机 CLI 为准）
7. **重启**：`openclaw gateway restart`

## 疑难对照（与你反馈的症状）

| 现象 | 优先检查 |
|------|-----------|
| 入库反馈正常但事后搜不到 | 是否写入磁盘；`memory index`；`memorySearch.extraPaths`；是否换过 agent id |
| 张冠李戴 | `USER.md` 人物表是否填写；是否要求先 `memory_search` 再回答 |
| 不查库、不深网 | `mcp.servers` 是否生效；`browser` 是否被 `gateway.tools.deny`；`AGENTS.md` 执行流程 |
| 隔夜忘 | 是否依赖会话而非 `MEMORY.md` / `memory/`；增大 `startupContext`；可选开启会话索引（见模板内注释） |

## 文件说明

| 文件 | 用途 |
|------|------|
| `openclaw.json` | 可直接部署的 **严格 JSON** 配置（已含 `gateway.tools.allow` 解除 browser 默认 HTTP 限制） |
| `openclaw.home-assistant.json5` | 同内容 JSON5 版（可注释，便于手改） |
| `install-to-home.sh` | 安装到 `~/.openclaw/` 的脚本 |
| `workspace-bootstrap/AGENTS.md` | 助手行为契约（检索→推理→落盘） |
| `workspace-bootstrap/USER.md` | 家庭成员与称谓锚点（请自行填写） |
| `workspace-bootstrap/MEMORY.md` | 长期记忆入口（长青） |
| `workspace-bootstrap/HEARTBEAT.md` | 定时心跳待办扫览 |

本仓库 **不包含** 你的密钥；请在 shell 环境变量或 OpenClaw 密钥管理中配置 MiniMax、Embedding 等。
