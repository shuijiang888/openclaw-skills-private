import { NextResponse } from "next/server";
import { getRequestUserContext } from "@/lib/request-user";
import { ztBootstrap } from "@/lib/zt-bootstrap";

export async function POST(req: Request) {
  const ctx = getRequestUserContext(req);
  // 允许管理员/超管，以及战区总指挥（GENERAL）执行初始化，便于演示与应急开局。
  const canBootstrap = ctx.isZtManager;
  if (!canBootstrap) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const summary = await ztBootstrap();
  return NextResponse.json({ ok: true, summary });
}
