import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { PROFIT_SESSION_COOKIE, signSessionToken, verifySessionToken } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const token = (await cookies()).get(PROFIT_SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const payload = await verifySessionToken(token).catch(() => null);
  if (!payload?.sub) {
    return NextResponse.json({ error: "会话失效，请重新登录" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as
    | { currentPassword?: string; newPassword?: string }
    | null;
  const currentPassword = String(body?.currentPassword ?? "");
  const newPassword = String(body?.newPassword ?? "");
  if (!currentPassword || newPassword.length < 8) {
    return NextResponse.json(
      { error: "请输入当前密码，且新密码至少8位" },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || !user.isActive) {
    return NextResponse.json({ error: "用户不存在或不可用" }, { status: 404 });
  }
  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "当前密码错误" }, { status: 401 });
  }
  if (currentPassword === newPassword) {
    return NextResponse.json(
      { error: "新密码不能与当前密码相同" },
      { status: 400 },
    );
  }

  const nextHash = await bcrypt.hash(newPassword, 10);
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: nextHash,
      mustChangePassword: false,
      passwordChangedAt: new Date(),
    },
  });

  const nextToken = await signSessionToken({
    id: updated.id,
    role: updated.role,
    email: updated.email,
    name: updated.name,
    isSuperAdmin: updated.isSuperAdmin,
    ztRole: updated.role,
    mustChangePassword: false,
  });
  const jar = await cookies();
  jar.set(PROFIT_SESSION_COOKIE, nextToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return NextResponse.json({ ok: true });
}
