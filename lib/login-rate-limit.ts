/**
 * 登录尝试限流（单实例；多副本请用网关或 Redis）。
 * 环境变量：PROFIT_LOGIN_RL_MAX（默认 20）、PROFIT_LOGIN_RL_WINDOW_MS（默认 900000=15min），设为 0 关闭。
 */

type LimitResult =
  | { ok: true }
  | { ok: false; retryAfterSec: number };

const buckets = new Map<string, number[]>();

export function isLoginRateLimitDisabled(): boolean {
  const max = Number(process.env.PROFIT_LOGIN_RL_MAX ?? 20);
  return !Number.isFinite(max) || max <= 0;
}

export function checkLoginRateLimit(clientKey: string): LimitResult {
  if (isLoginRateLimitDisabled()) return { ok: true };

  const max = Number(process.env.PROFIT_LOGIN_RL_MAX ?? 20);
  const windowMs = Number(
    process.env.PROFIT_LOGIN_RL_WINDOW_MS ?? 900_000,
  );
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
