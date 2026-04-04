import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequestUserContext } from "@/lib/request-user";
import { readUserProgress } from "@/lib/zt-points";
import { ensureZtBootstrap } from "@/lib/zt-bootstrap";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  await ensureZtBootstrap();
  const ctx = getRequestUserContext(req);
  if (!ctx.userId) {
    return NextResponse.json({ error: "未登录，无法读取个人工作台" }, { status: 401 });
  }

  const [progress, submissions, redemptions, rankLogs] = await Promise.all([
    readUserProgress(prisma, ctx.userId),
    prisma.ztSubmission.findMany({
      where: { userId: ctx.userId },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prisma.ztRedemption.findMany({
      where: { userId: ctx.userId },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prisma.ztRankChangeLog.findMany({
      where: { userId: ctx.userId },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
  ]);

  return NextResponse.json({
    me: {
      userId: ctx.userId,
      email: ctx.userEmail,
      ztRole: ctx.ztRole,
      progress,
    },
    submissions,
    redemptions,
    rankLogs,
  });
}
