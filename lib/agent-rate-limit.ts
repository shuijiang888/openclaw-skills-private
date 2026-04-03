/**
 * 进程内滑动窗口限流（单实例有效；多副本请前置 API 网关或 Redis）。
 */

type LimitResult =
  | { ok: true }
  | { ok: false; retryAfterSec: number };

const buckets = new Map<string, number[]>();

export function isAgentRateLimitDisabled(): boolean {
  const max = Number(process.env.PROFIT_AGENT_RL_MAX ?? 40);
  return !Number.isFinite(max) || max <= 0;
}

export function checkAgentRateLimit(clientKey: string): LimitResult {
  if (isAgentRateLimitDisabled()) return { ok: true };

  const max = Number(process.env.PROFIT_AGENT_RL_MAX ?? 40);
  const windowMs = Number(process.env.PROFIT_AGENT_RL_WINDOW_MS ?? 60_000);
  const now = Date.now();

  let hits = buckets.get(clientKey) ?? [];
  hits = hits.filter((t) => now - t < windowMs);

  if (hits.length >= max) {
    const oldest = hits[0]!;
    const retryAfterSec = Math.ceil(
      Math.max(0, windowMs - (now - oldest)) / 1000,
    );
    buckets.set(clientKey, hits);
    return { ok: false, retryAfterSec: Math.max(1, retryAfterSec) };
  }

  hits.push(now);
  buckets.set(clientKey, hits);
  return { ok: true };
}

export function getRequestClientKey(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return `ip:${first}`;
  }
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return `ip:${realIp}`;
  return "ip:unknown";
}
