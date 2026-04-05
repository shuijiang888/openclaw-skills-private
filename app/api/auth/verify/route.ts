import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getRequestClientKey } from "@/lib/agent-rate-limit";
import {
  checkGateAttempt,
  checkGateLock,
  clearGateAttemptState,
  getGateCookieValue,
  registerGateAttemptFailure,
  signGateToken,
  verifyGateAuthToken,
} from "@/lib/gate-auth";
import { PLATFORM_AUTH_COOKIE } from "@/lib/session-cookie";

export const dynamic = "force-dynamic";

function readGatePassword(): string {
  const v = process.env.AUTH_PASSWORD?.trim() ?? "";
  if (!/^\d{6}$/.test(v)) return "888888";
  return v;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { password?: string }
    | null;
  const password = typeof body?.password === "string" ? body.password.trim() : "";
  if (!password) {
    return NextResponse.json({ error: "请输入密码" }, { status: 400 });
  }

  const clientKey = getRequestClientKey(req);
  const lock = checkGateLock(clientKey);
  if (!lock.ok) {
    return NextResponse.json(
      {
        error: "尝试过多，已锁定",
        locked: true,
        retryAfterSec: lock.retryAfterSec,
      },
      { status: 429, headers: { "Retry-After": String(lock.retryAfterSec) } },
    );
  }

  if (password !== readGatePassword()) {
    const fail = registerGateAttemptFailure(clientKey);
    if (fail.locked) {
      return NextResponse.json(
        {
          error: "密码错误，已锁定 5 分钟",
          locked: true,
          retryAfterSec: fail.retryAfterSec,
          remaining: 0,
        },
        {
          status: 429,
          headers: { "Retry-After": String(fail.retryAfterSec) },
        },
      );
    }
    return NextResponse.json(
      {
        error: "密码错误",
        locked: false,
        remaining: fail.remaining,
      },
      { status: 401 },
    );
  }

  clearGateAttemptState(clientKey);
  const token = await signGateToken({
    kind: "gate_access",
    failedAttempts: 0,
    lockUntil: null,
  });
  const jar = await cookies();
  jar.set(PLATFORM_AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.AUTH_GATE_COOKIE_SECURE === "1",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return NextResponse.json({ ok: true, cookie: getGateCookieValue(token) });
}

export async function GET(req: Request) {
  const clientKey = getRequestClientKey(req);
  const token = (await cookies()).get(PLATFORM_AUTH_COOKIE)?.value;
  const lock = checkGateLock(clientKey);
  const attempt = checkGateAttempt(clientKey);
  return NextResponse.json({
    ok: true,
    authenticated: await verifyGateAuthToken(token),
    locked: !lock.ok,
    retryAfterSec: lock.ok ? 0 : lock.retryAfterSec,
    remaining: attempt.remaining,
  });
}
