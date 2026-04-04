import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { demoRoleFromRequest } from "@/lib/http";
import { ensureZtBootstrap } from "@/lib/zt-bootstrap";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  await ensureZtBootstrap();
  const actorRole = demoRoleFromRequest(req);

  const [
    signals,
    openActionCards,
    bountyTasks,
    submissions,
    wallet,
    redemptions,
  ] = await Promise.all([
    prisma.ztSignal.count(),
    prisma.ztActionCard.count({ where: { status: "OPEN" } }),
    prisma.ztBountyTask.count({ where: { status: "OPEN" } }),
    prisma.ztSubmission.count(),
    prisma.ztPointWallet.findUnique({ where: { actorRole } }),
    prisma.ztRedemption.count({ where: { actorRole } }),
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
    metrics: {
      signals,
      openActionCards,
      bountyTasks,
      submissions,
      redemptions,
    },
  });
}
