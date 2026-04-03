import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { APP_VERSION } from "@/lib/app-release";

export const dynamic = "force-dynamic";

/** 负载均衡 / 编排探活；不鉴权。可选 ?db=0 跳过数据库探测 */
export async function GET(req: Request) {
  const skipDb = new URL(req.url).searchParams.get("db") === "0";

  if (skipDb) {
    return NextResponse.json({
      ok: true,
      version: APP_VERSION,
      db: "skipped",
    });
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      ok: true,
      version: APP_VERSION,
      db: "up",
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        version: APP_VERSION,
        db: "down",
        error: "database_unreachable",
      },
      { status: 503 },
    );
  }
}
