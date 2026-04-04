import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { PROFIT_SESSION_COOKIE, verifySessionToken } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** 供前端读取当前登录角色（不鉴权失败，未登录或密钥未配时返回 user: null） */
export async function GET() {
  try {
    const jar = await cookies();
    const token = jar.get(PROFIT_SESSION_COOKIE)?.value;
    if (!token) {
      return NextResponse.json({ user: null });
    }
    const p = await verifySessionToken(token);
    const dbUser = await prisma.user.findUnique({
      where: { id: p.sub },
      select: {
        id: true,
        email: true,
        role: true,
        isSuperAdmin: true,
        isActive: true,
        ztAllowInteractiveLlm: true,
        orgUnitId: true,
        orgUnit: { select: { id: true, name: true, code: true } },
      },
    });
    if (!dbUser || !dbUser.isActive) {
      return NextResponse.json({ user: null });
    }
    return NextResponse.json({
      user: {
        id: dbUser.id,
        email: dbUser.email,
        role: dbUser.role,
        ztRole: dbUser.role,
        isSuperAdmin: dbUser.isSuperAdmin,
        ztAllowInteractiveLlm: dbUser.ztAllowInteractiveLlm,
        orgUnitId: dbUser.orgUnitId,
        orgUnit: dbUser.orgUnit,
      },
    });
  } catch {
    return NextResponse.json({ user: null });
  }
}
