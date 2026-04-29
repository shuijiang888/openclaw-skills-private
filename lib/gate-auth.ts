import { SignJWT, jwtVerify } from "jose";

export const GATE_AUTH_COOKIE = "ai_platform_auth";

const DEFAULT_LOCK_MINUTES = 5;
const DEFAULT_MAX_ATTEMPTS = 3;

export function getGatePassword(): string {
  const pwd = process.env.AUTH_PASSWORD?.trim() ?? "";
  if (/^\d{6}$/.test(pwd)) return pwd;
  // 按验收规范默认口令回退，避免环境变量遗漏导致门禁接口 500。
  return "111600";
}

function gateSecretBytes(): Uint8Array {
  const authGateSecret = process.env.AUTH_GATE_SECRET?.trim();
  const sessionSecret = process.env.PROFIT_AUTH_SECRET?.trim();
  const selected = authGateSecret || sessionSecret;
  if (selected && selected.length >= 16) {
    return new TextEncoder().encode(selected);
  }
  // 回退到基于口令的派生密钥，避免因环境变量遗漏导致门禁 API 500。
  const fallback = `gate-${getGatePassword()}-fallback-secret`;
  return new TextEncoder().encode(fallback);
}

type GateTokenPayload = {
  kind: "gate_access";
  failedAttempts: number;
  lockUntil: number | null;
};

export async function signGateToken(payload: GateTokenPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(gateSecretBytes());
}

export async function verifyGateToken(token: string): Promise<GateTokenPayload> {
  const { payload } = await jwtVerify(token, gateSecretBytes());
  return {
    kind: payload.kind === "gate_access" ? "gate_access" : "gate_access",
    failedAttempts: Number(payload.failedAttempts ?? 0),
    lockUntil:
      payload.lockUntil == null ? null : Number(payload.lockUntil ?? null),
  };
}

export async function verifyGateAuthToken(
  token: string | null | undefined,
): Promise<boolean> {
  if (!token) return false;
  try {
    const payload = await verifyGateToken(token);
    if (payload.kind !== "gate_access") return false;
    return !isGateLocked(payload).locked;
  } catch {
    return false;
  }
}

export function gateCookieOptions() {
  return {
    httpOnly: true as const,
    secure: process.env.AUTH_GATE_COOKIE_SECURE === "1",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };
}

export function buildFailureState(
  previous: GateTokenPayload | null,
): GateTokenPayload {
  const now = Date.now();
  const maxAttempts = Number(
    process.env.AUTH_MAX_ATTEMPTS ?? DEFAULT_MAX_ATTEMPTS,
  );
  const lockMinutes = Number(
    process.env.AUTH_LOCK_MINUTES ?? DEFAULT_LOCK_MINUTES,
  );
  const prevAttempts = previous?.failedAttempts ?? 0;
  const attempts = prevAttempts + 1;
  const shouldLock = attempts >= Math.max(1, maxAttempts);

  return {
    kind: "gate_access",
    failedAttempts: shouldLock ? 0 : attempts,
    lockUntil: shouldLock ? now + Math.max(1, lockMinutes) * 60_000 : null,
  };
}

export function isGateLocked(payload: GateTokenPayload | null): {
  locked: boolean;
  remainSeconds: number;
} {
  const lockUntil = payload?.lockUntil ?? null;
  if (!lockUntil) return { locked: false, remainSeconds: 0 };
  const remainMs = lockUntil - Date.now();
  if (remainMs <= 0) return { locked: false, remainSeconds: 0 };
  return { locked: true, remainSeconds: Math.ceil(remainMs / 1000) };
}

const gateAttemptBuckets = new Map<string, number[]>();
const gateLockBuckets = new Map<string, number>();

function gateMaxAttempts(): number {
  const n = Number(process.env.AUTH_MAX_ATTEMPTS ?? DEFAULT_MAX_ATTEMPTS);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_MAX_ATTEMPTS;
}

function gateLockMs(): number {
  const mins = Number(process.env.AUTH_LOCK_MINUTES ?? DEFAULT_LOCK_MINUTES);
  const safeMins = Number.isFinite(mins) && mins > 0 ? mins : DEFAULT_LOCK_MINUTES;
  return Math.floor(safeMins * 60_000);
}

export function clearGateAttemptState(clientKey: string): void {
  gateAttemptBuckets.delete(clientKey);
  gateLockBuckets.delete(clientKey);
}

export function checkGateLock(clientKey: string): {
  ok: boolean;
  retryAfterSec: number;
} {
  const lockUntil = gateLockBuckets.get(clientKey) ?? 0;
  const remain = lockUntil - Date.now();
  if (remain <= 0) return { ok: true, retryAfterSec: 0 };
  return { ok: false, retryAfterSec: Math.max(1, Math.ceil(remain / 1000)) };
}

export function checkGateAttempt(clientKey: string): { remaining: number } {
  const max = gateMaxAttempts();
  const now = Date.now();
  const lockWindow = gateLockMs();
  const list = (gateAttemptBuckets.get(clientKey) ?? []).filter(
    (ts) => now - ts <= lockWindow,
  );
  gateAttemptBuckets.set(clientKey, list);
  return { remaining: Math.max(0, max - list.length) };
}

export function registerGateAttemptFailure(clientKey: string): {
  locked: boolean;
  retryAfterSec: number;
  remaining: number;
} {
  const max = gateMaxAttempts();
  const now = Date.now();
  const lockWindow = gateLockMs();
  const list = (gateAttemptBuckets.get(clientKey) ?? []).filter(
    (ts) => now - ts <= lockWindow,
  );
  list.push(now);
  gateAttemptBuckets.set(clientKey, list);

  if (list.length >= max) {
    const until = now + lockWindow;
    gateLockBuckets.set(clientKey, until);
    gateAttemptBuckets.set(clientKey, []);
    return {
      locked: true,
      retryAfterSec: Math.max(1, Math.ceil(lockWindow / 1000)),
      remaining: 0,
    };
  }
  return {
    locked: false,
    retryAfterSec: 0,
    remaining: Math.max(0, max - list.length),
  };
}

export function getGateCookieValue(token: string): string {
  return token;
}
