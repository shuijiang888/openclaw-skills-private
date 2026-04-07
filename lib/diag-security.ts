import { randomUUID } from "node:crypto";

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function makeRequestId(): string {
  return randomUUID();
}

export function getClientIpFromRequest(req: Request): string {
  const xff = normalizeText(req.headers.get("x-forwarded-for"));
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = normalizeText(req.headers.get("x-real-ip"));
  if (realIp) return realIp;
  return "unknown";
}

export function deriveClientIp(req: Request): string {
  return getClientIpFromRequest(req);
}

export function getSafeUserAgent(req: Request): string {
  return normalizeText(req.headers.get("user-agent")).slice(0, 255) || "unknown";
}

export function redactedIpFromRequest(req: Request): string {
  return maskIp(getClientIpFromRequest(req));
}

export function maskPhone(raw: string): string {
  const value = raw.trim();
  if (value.length < 7) return "***";
  return `${value.slice(0, 3)}****${value.slice(-4)}`;
}

export function sanitizePhone(raw: string): string {
  return raw.replace(/[^\d+]/g, "").trim();
}

export function normalizeLeadKind(value: string): "diagnosis_summary" | "expert_opportunity" | null {
  const v = value.trim();
  if (v === "diagnosis_summary" || v === "expert_opportunity") return v;
  return null;
}

export type LeadKind = "diagnosis_summary" | "expert_opportunity";

export function normalizeIndustryEdition(value: string | null): string | null {
  const v = (value ?? "").trim();
  if (!v) return null;
  const allowed = new Set(["medical_device", "energy", "smart_manufacturing"]);
  return allowed.has(v) ? v : null;
}

export function validateDateOnly(v: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(v);
}

export function toIsoDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function maskIp(value: string): string {
  const v = (value || "").trim();
  if (!v || v === "unknown") return "unknown";
  if (v.includes(":")) return "ipv6_masked";
  const parts = v.split(".");
  if (parts.length !== 4) return "unknown";
  return `${parts[0]}.${parts[1]}.x.x`;
}

export function sanitizeBodyForLog(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(sanitizeBodyForLog);
  if (typeof value !== "object") return value;
  const obj = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  const sensitive = new Set(["phone", "mobile", "password", "token", "authorization"]);
  for (const [k, v] of Object.entries(obj)) {
    if (sensitive.has(k.toLowerCase())) {
      out[k] = typeof v === "string" ? maskPhone(v) : "***";
      continue;
    }
    out[k] = sanitizeBodyForLog(v);
  }
  return out;
}

export function safeJsonStringify(value: unknown): string {
  try {
    return JSON.stringify(value ?? {});
  } catch {
    return "{}";
  }
}

export function safeJsonValue(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

type RateLimitResult = { ok: true } | { ok: false; retryAfterSec: number };
const diagBuckets = new Map<string, number[]>();

export function getDiagClientKey(req: Request): string {
  return `ip:${getClientIpFromRequest(req)}`;
}

export function checkDiagRateLimit(
  clientKey: string,
  max = Number(process.env.PROFIT_DIAG_RL_MAX ?? 120),
  windowMs = Number(process.env.PROFIT_DIAG_RL_WINDOW_MS ?? 60_000),
): RateLimitResult {
  if (!Number.isFinite(max) || max <= 0) return { ok: true };
  const now = Date.now();
  let hits = diagBuckets.get(clientKey) ?? [];
  hits = hits.filter((t) => now - t < windowMs);
  if (hits.length >= max) {
    const oldest = hits[0] ?? now;
    const retryAfterSec = Math.ceil(Math.max(0, windowMs - (now - oldest)) / 1000);
    diagBuckets.set(clientKey, hits);
    return { ok: false, retryAfterSec: Math.max(1, retryAfterSec) };
  }
  hits.push(now);
  diagBuckets.set(clientKey, hits);
  return { ok: true };
}

