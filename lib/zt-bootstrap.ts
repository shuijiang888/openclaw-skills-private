import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { applyPointsAndSyncRank } from "@/lib/zt-points";

const ROLE_BASE_POINTS: Record<string, number> = {
  SALES_MANAGER: 120,
  SALES_DIRECTOR: 180,
  SALES_VP: 260,
  GM: 320,
  ADMIN: 220,
};

export async function ensureZt007Seed(prisma: PrismaClient) {
  await prisma.ztSystemConfig.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      llmEnabled: true,
      llmProvider: "minimax",
      llmModel: "MiniMax-M2.7",
      llmInteractiveEnabled: true,
      llmPasswordRequired: true,
      llmAutomationBypassPassword: true,
      mobileExperienceEnabled: true,
      multiEndpointEnabled: true,
    },
  });

  for (const [actorRole, points] of Object.entries(ROLE_BASE_POINTS)) {
    await prisma.ztPointWallet.upsert({
      where: { actorRole },
      update: {},
      create: {
        actorRole,
        points,
        lifetimePoints: points,
        rank: "战士",
        rankLevel: 1,
      },
    });
  }

  const roleWallets = await prisma.ztPointWallet.findMany({
    where: { userId: null, actorRole: { not: null } },
  });
  for (const row of roleWallets) {
    await applyPointsAndSyncRank(prisma, {
      actorRole: row.actorRole,
      pointsDelta: 0,
      action: "BOOTSTRAP_SYNC_RANK",
      reason: "bootstrap sync rank",
    });
  }

  if ((await prisma.ztActionCard.count()) === 0) {
    await prisma.ztActionCard.createMany({
      data: [
        {
          title: "P0 · CIO changed at Alpha Medical",
          reason: "Role change + budget cycle + trusted source",
          suggestion: "Contact relationship chain within 24h with script A3",
          priority: "P0",
          assignedRole: "SALES_DIRECTOR",
          rewardPoints: 20,
        },
        {
          title: "P1 · ERP hiring spike at SmartFab",
          reason: "12 implementation hiring signals detected",
          suggestion: "Schedule discovery questions in next customer touchpoint",
          priority: "P1",
          assignedRole: "SALES_MANAGER",
          rewardPoints: 15,
        },
        {
          title: "P1 · Regional subsidy policy update",
          reason: "Policy fit for at least 8 target accounts",
          suggestion: "Push policy brief and create two follow-up calls this week",
          priority: "P1",
          assignedRole: "SALES_VP",
          rewardPoints: 10,
        },
      ],
    });
  }

  if ((await prisma.ztBountyTask.count()) === 0) {
    await prisma.ztBountyTask.createMany({
      data: [
        {
          title: "Collect CIO changes in Q2",
          description: "Submit source links + screenshots + date evidence",
          taskType: "strategic",
          rewardPoints: 80,
          status: "OPEN",
        },
        {
          title: "Scan competitor discount campaigns",
          description: "Three-city campaign intelligence with account impact",
          taskType: "tactical",
          rewardPoints: 50,
          status: "OPEN",
        },
        {
          title: "Publish one reusable win-case script",
          description: "Structured template with breakthrough point and wording",
          taskType: "knowledge",
          rewardPoints: 35,
          status: "OPEN",
        },
      ],
    });
  }

  if ((await prisma.ztSignal.count()) === 0) {
    await prisma.ztSignal.createMany({
      data: [
        {
          title: "CIO changed at Alpha Medical",
          content: "New CIO joined from top cloud vendor.",
          signalType: "strategic",
          region: "Shenzhen",
          sourceFormat: "text",
          actorRole: "SALES_DIRECTOR",
          points: 8,
          status: "NEW",
        },
        {
          title: "ERP hiring growth at SmartFab",
          content: "12 ERP implementation openings posted this week.",
          signalType: "tactical",
          region: "Guangzhou",
          sourceFormat: "link",
          actorRole: "SALES_MANAGER",
          points: 6,
          status: "NEW",
        },
      ],
    });
  }

  return {
    wallets: await prisma.ztPointWallet.count(),
    actionCards: await prisma.ztActionCard.count(),
    tasks: await prisma.ztBountyTask.count(),
    signals: await prisma.ztSignal.count(),
    rankLogs: await prisma.ztRankChangeLog.count(),
  };
}

export async function ensureZtBootstrap() {
  return ensureZt007Seed(prisma);
}

export async function ztBootstrap() {
  return ensureZt007Seed(prisma);
}
