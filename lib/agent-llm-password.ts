import { createHash } from "node:crypto";

function envBool(name: string): boolean | null {
  const raw = process.env[name];
  if (raw == null) return null;
  const v = raw.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

/**
 * 生产环境默认开启口令闸门；开发环境默认关闭。
 * 可通过 PROFIT_LLM_PASSWORD_REQUIRED 显式覆盖。
 */
export function isLlmPasswordRequired(): boolean {
  const forced = envBool("PROFIT_LLM_PASSWORD_REQUIRED");
  if (forced != null) return forced;
  return process.env.NODE_ENV === "production";
}

function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

/**
 * 大模型口令验证（每次调用校验）。
 * 支持明文口令或 sha256 口令哈希（二选一）。
 */
export function verifyLlmAccessPassword(input: string | null | undefined): boolean {
  if (!isLlmPasswordRequired()) return true;

  const plain = process.env.PROFIT_LLM_ACCESS_PASSWORD?.trim();
  const hashed = process.env.PROFIT_LLM_ACCESS_PASSWORD_SHA256?.trim().toLowerCase();
  const candidate = (input ?? "").trim();
  if (!candidate) return false;

  if (hashed) {
    return sha256Hex(candidate) === hashed;
  }
  if (plain) {
    return candidate === plain;
  }

  // 开启了口令闸门，但未配置口令，视为不通过。
  return false;
}

export function verifyAgentLlmPassword(input: string | null | undefined): {
  ok: boolean;
  reason: string;
} {
  if (!isLlmPasswordRequired()) {
    return { ok: true, reason: "llm_password_not_required" };
  }
  if (!input || !input.trim()) {
    return { ok: false, reason: "llm_password_missing" };
  }
  if (!verifyLlmAccessPassword(input)) {
    return { ok: false, reason: "llm_password_invalid" };
  }
  return { ok: true, reason: "llm_password_verified" };
}
