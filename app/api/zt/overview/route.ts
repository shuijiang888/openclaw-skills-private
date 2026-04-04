import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ztRoleFromRequest } from "@/lib/http";
import { getRequestUserContext } from "@/lib/request-user";
import { readUserProgress } from "@/lib/zt-points";
import { actorRoleCandidatesForZt } from "@/lib/zt-ranks";
import { ensureZtBootstrap } from "@/lib/zt-bootstrap";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await ensureZtBootstrap();
    const actorRole = ztRoleFromRequest(req);
    const actorRoleCandidates = actorRoleCandidatesForZt(actorRole);
    const userCtx = getRequestUserContext(req);

    const [
      signals,
      openActionCards,
      bountyTasks,
      submissions,
      wallet,
      redemptions,
      userProgress,
    ] = await Promise.all([
      prisma.ztSignal.count(),
      prisma.ztActionCard.count({ where: { status: "OPEN" } }),
      prisma.ztBountyTask.count({ where: { status: "OPEN" } }),
      prisma.ztSubmission.count(),
      userCtx.userId
        ? prisma.ztPointWallet.findUnique({ where: { userId: userCtx.userId } })
        : prisma.ztPointWallet.findFirst({
            where: { actorRole: { in: actorRoleCandidates } },
            orderBy: { updatedAt: "desc" },
          }),
      userCtx.userId
        ? prisma.ztRedemption.count({ where: { userId: userCtx.userId } })
        : prisma.ztRedemption.count({
            where: { actorRole: { in: actorRoleCandidates } },
          }),
      readUserProgress(prisma, userCtx.userId),
    ]);

    return NextResponse.json({
      overview: {
        systemName: "智探007",
        mode: "Standalone",
        rolloutWave: "Wave 1",
        activeUsers: 30,
        targetUsers: 300,
        opportunityLiftPct: 18.4,
        actionExecution48hPct: 42,
        feedbackCompletionPct: 63,
        budgetProfile: "low",
        honorStyle: "professional-authoritative",
        redemptionCoordinator: "Jiang Shui",
      },
      wallet: wallet ? { actorRole: wallet.actorRole, points: wallet.points } : null,
      user: userProgress
        ? {
            ...userProgress,
            userId: userCtx.userId,
            ztRole: userCtx.ztRole,
          }
        : null,
      metrics: {
        signals,
        openActionCards,
        bountyTasks,
        submissions,
        redemptions,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "overview_unavailable",
        message: error instanceof Error ? error.message : "overview unavailable",
      },
      { status: 503 },
    );
  }
}
