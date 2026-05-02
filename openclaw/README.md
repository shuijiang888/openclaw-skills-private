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

1. **备份** 现有配置：
   ```bash
   cp ~/.openclaw/openclaw.json ~/.openclaw/openclaw.json.bak.$(date +%Y%m%d)
   ```
2. **合并配置**：将 `openclaw.home-assistant.json5` 的内容按需合并进 `~/.openclaw/openclaw.json`（JSON5 支持注释与尾逗号）。不要直接覆盖若你已有无可替代的自定义块——建议逐段复制 `gateway` / `browser` / `agents` / `memory` / `plugins` / `skills` / `mcp`。
3. **校验**：
   ```bash
   openclaw doctor --fix
   openclaw config schema   # 需要时对照字段
   ```
4. **工作区引导**：将 `workspace-bootstrap/` 内文件复制到 OpenClaw 工作区根目录（默认 `~/.openclaw/workspace/`），至少包含 `AGENTS.md`、`USER.md`，并按家庭情况填写 `USER.md`。
5. **Embedding（记忆检索）**：主对话可用 MiniMax；**向量记忆**仍需单独 Embedding（OpenAI / Gemini / 本地 Ollama 等）。在 `openclaw.json` 的 `agents.defaults.memorySearch` 中填写你已可用的 provider；否则会出现「说入库了但搜不到」。
6. **重建索引**（换 embedding 或路径后）：
   ```bash
   openclaw memory index --force --agent main
   ```

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
| `openclaw.home-assistant.json5` | 家庭助手强化配置模板 |
| `workspace-bootstrap/AGENTS.md` | 助手行为契约（检索→推理→落盘） |
| `workspace-bootstrap/USER.md` | 家庭成员与称谓锚点（请自行填写） |

本仓库 **不包含** 你的密钥；请在 shell 环境变量或 OpenClaw 密钥管理中配置 MiniMax、Embedding 等。
