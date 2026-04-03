import { NextResponse } from "next/server";
import { getBossBriefing } from "@/lib/boss-briefing";

/** B2：组合指标 + 简报叙事，供仪表盘与报价台卡片消费（当前库数据口径） */
export async function GET() {
  const body = await getBossBriefing();
  return NextResponse.json(body);
}
