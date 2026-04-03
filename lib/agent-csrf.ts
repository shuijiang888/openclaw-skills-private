import { randomBytes } from "crypto";

export { ASSISTANT_CSRF_COOKIE, ASSISTANT_CSRF_HEADER } from "@/lib/agent-csrf-constants";

/** 生产环境默认开启；本地可 PROFIT_AGENT_CSRF=0 关闭 */
export function isAssistantCsrfEnabled(): boolean {
  const v = process.env.PROFIT_AGENT_CSRF?.trim().toLowerCase();
  if (v === "0" || v === "false") return false;
  if (v === "1" || v === "true") return true;
  return process.env.NODE_ENV === "production";
}

export function createAssistantCsrfToken(): string {
  return randomBytes(24).toString("base64url");
}
