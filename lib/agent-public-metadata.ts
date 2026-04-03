/** 减少对外暴露的内网拓扑（baseUrl、模型枚举等），用于生产或公网演示。 */
export function shouldRedactAgentProbeDetails(): boolean {
  const v = process.env.PROFIT_REDACT_AGENT_PROBE?.trim().toLowerCase();
  if (v === "1" || v === "true") return true;
  if (v === "0" || v === "false") return false;
  return process.env.NODE_ENV === "production";
}
