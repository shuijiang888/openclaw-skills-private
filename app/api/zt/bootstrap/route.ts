import { NextResponse } from "next/server";
import { getRequestUserContext } from "@/lib/request-user";
import { ztBootstrap } from "@/lib/zt-bootstrap";

export async function POST(req: Request) {
  const ctx = getRequestUserContext(req);
  if (!ctx.isAdminLike) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const summary = await ztBootstrap();
  return NextResponse.json({ ok: true, summary });
}
