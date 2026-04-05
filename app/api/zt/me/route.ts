import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequestUserContext } from "@/lib/request-user";
import { readUserProgress } from "@/lib/zt-points";
import { ensureZtBootstrap } from "@/lib/zt-bootstrap";
import { rankByPoints } from "@/lib/zt-ranks";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  await ensureZtBootstrap();
  const ctx = getRequestUserContext(req);
  if (!ctx.userId) {
    const wallet = await prisma.ztPointWallet.findUnique({
      where: { actorRole: ctx.ztRole },
      select: {
        points: true,
        lifetimePoints: true,
        rank: true,
        updatedAt: true,
      },
    });
    const safePoints = wallet?.points ?? 0;
    const safeLifetime = wallet?.lifetimePoints ?? safePoints;
    const rank = wallet?.rank || rankByPoints(safePoints).label;
    const next = [200, 500, 1000, 2000, 4000, 7000, 11000].find(
      (x) => x > safePoints,
    );
    const [submissions, redemptions, rankLogs] = await Promise.all([
      prisma.ztSubmission.findMany({
        where: { actorRole: ctx.ztRole },
        orderBy: { createdAt: "desc" },
        take: 12,
      }),
      prisma.ztRedemption.findMany({
        where: { actorRole: ctx.ztRole },
        orderBy: { createdAt: "desc" },
        take: 12,
      }),
      prisma.ztRankChangeLog.findMany({
        where: { actorRole: ctx.ztRole },
        orderBy: { createdAt: "desc" },
        take: 12,
      }),
    ]);
    return NextResponse.json({
      me: {
        userId: `demo:${ctx.ztRole}`,
        email: null,
        ztRole: ctx.ztRole,
        progress: {
          points: safePoints,
          lifetimePoints: safeLifetime,
          rank,
          nextRankAt: next ?? null,
          progressToNext: next ? Math.max(0, next - safePoints) : 0,
          lastRankChangedAt: rankLogs[0]?.createdAt ?? null,
          updatedAt: wallet?.updatedAt ?? null,
        },
      },
      submissions,
      redemptions,
      rankLogs,
      demoMode: true,
    });
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
