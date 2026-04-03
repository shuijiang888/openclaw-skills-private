import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { PROFIT_SESSION_COOKIE, verifySessionToken } from "@/lib/session";

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
    return NextResponse.json({
      user: { id: p.sub, email: p.email, role: p.role },
    });
  } catch {
    return NextResponse.json({ user: null });
  }
}
