import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { PROFIT_SESSION_COOKIE } from "@/lib/session-cookie";

export const dynamic = "force-dynamic";

export async function POST() {
  const jar = await cookies();
  jar.set(PROFIT_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return NextResponse.json({ ok: true });
}
