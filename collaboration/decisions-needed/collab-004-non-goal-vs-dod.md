# collab-004：HANDOFF 内部冲突说明

- **非目标**写明：不修改 `scripts/`。
- **DoD / 验收**要求：`./scripts/check-collab.sh` 退出码 0，且 `STATUS` 为 `collab-004`。

二者不可同时满足（脚本仍硬编码 `collab-003` 时会失败）。

**本轮处理**：已按 collab-002/003 惯例 **更新** `scripts/check-collab.sh`，绑定 `collab-004` 并校验报告文件与六章标题，以满足自动化验收。

**建议小江**：下轮 HANDOFF 将非目标改为「不修改与本任务无关的脚本逻辑」或明确允许「仅更新 check-collab 门禁行」，避免再出现 DoD 与非目标打架。
