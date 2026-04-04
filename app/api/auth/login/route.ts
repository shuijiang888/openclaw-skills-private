import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getRequestClientKey } from "@/lib/agent-rate-limit";
import { checkLoginRateLimit } from "@/lib/login-rate-limit";
import {
  PROFIT_SESSION_COOKIE,
  signSessionToken,
  getSessionSecretBytes,
} from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let secretOk = true;
  try {
    getSessionSecretBytes();
  } catch {
    secretOk = false;
  }
  if (!secretOk) {
    return NextResponse.json(
      { error: "服务器未配置 PROFIT_AUTH_SECRET，无法登录" },
      { status: 500 },
    );
  }

  const rl = checkLoginRateLimit(getRequestClientKey(req));
  if (!rl.ok) {
    return NextResponse.json(
      { error: "登录尝试过于频繁，请稍后再试" },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfterSec) },
      },
    );
  }

  const body = (await req.json().catch(() => null)) as {
    email?: string;
    password?: string;
  } | null;
  const email =
    typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!email || !password) {
    return NextResponse.json({ error: "请输入邮箱与密码" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: "邮箱或密码错误" }, { status: 401 });
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "邮箱或密码错误" }, { status: 401 });
  }

  const token = await signSessionToken({
    id: user.id,
    role: user.role,
    email: user.email,
    name: user.name,
    isSuperAdmin: user.isSuperAdmin,
    ztRole: user.role,
  });
  const jar = await cookies();
  jar.set(PROFIT_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return NextResponse.json({
    ok: true,
    user: { email: user.email, role: user.role, name: user.name },
  });
}
