import type { PrismaClient, Prisma } from "@prisma/client";
import { parseDemoRole } from "@/lib/approval";
import { rankByPoints } from "@/lib/zt-ranks";

type Ctx = {
  userId: string | null;
  actorName: string;
  actorRole: string;
};

export function deriveActorRoleForZt(userRole: string): string {
  return parseDemoRole(userRole);
}

async function currentContext(
  tx: Prisma.TransactionClient | PrismaClient,
  input?: { userId?: string | null; actorRole?: string | null },
): Promise<Ctx> {
  const userId = input?.userId;
  if (!userId) {
    return {
      userId: null,
      actorName: "访客",
      actorRole: parseDemoRole(input?.actorRole),
    };
  }
  const u = await tx.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, role: true, email: true },
  });
  if (!u) {
    return {
      userId: null,
      actorName: "访客",
      actorRole: parseDemoRole(input?.actorRole),
    };
  }
  return {
    userId: u.id,
    actorName: u.name?.trim() || u.email || "未命名用户",
    actorRole: deriveActorRoleForZt(u.role),
  };
}

export async function ensureWalletForUser(
  tx: Prisma.TransactionClient | PrismaClient,
  input?: { userId?: string | null; actorRole?: string | null },
) {
  const ctx = await currentContext(tx, input);
  const rank = rankByPoints(0);
  const wallet = ctx.userId
    ? await tx.ztPointWallet.upsert({
        where: { userId: ctx.userId },
        update: {},
        create: {
          userId: ctx.userId,
          actorRole: null,
          points: 0,
          lifetimePoints: 0,
          rank: rank.label,
          rankLevel: 1,
        },
      })
    : await tx.ztPointWallet.upsert({
        where: { actorRole: ctx.actorRole },
        update: {},
        create: {
          userId: null,
          actorRole: ctx.actorRole,
          points: 0,
          lifetimePoints: 0,
          rank: rank.label,
          rankLevel: 1,
        },
      });
  return { wallet, ctx };
}

export async function applyPointsAndSyncRank(
  tx: Prisma.TransactionClient | PrismaClient,
  input: {
    userId?: string | null;
    actorRole?: string | null;
    pointsDelta: number;
    action: string;
    reason?: string;
    refType?: string;
    refId?: string;
    actorName?: string | null;
  },
) {
  const ctx = await currentContext(tx, {
    userId: input.userId,
    actorRole: input.actorRole,
  });
  const rank0 = rankByPoints(0);
  const wallet = ctx.userId
    ? await tx.ztPointWallet.upsert({
        where: { userId: ctx.userId },
        update: {
          points: { increment: input.pointsDelta },
          lifetimePoints:
            input.pointsDelta > 0 ? { increment: input.pointsDelta } : undefined,
        },
        create: {
          userId: ctx.userId,
          actorRole: null,
          points: Math.max(0, input.pointsDelta),
          lifetimePoints: Math.max(0, input.pointsDelta),
          rank: rank0.label,
          rankLevel: 1,
        },
      })
    : await tx.ztPointWallet.upsert({
        where: { actorRole: ctx.actorRole },
        update: {
          points: { increment: input.pointsDelta },
          lifetimePoints:
            input.pointsDelta > 0 ? { increment: input.pointsDelta } : undefined,
        },
        create: {
          userId: null,
          actorRole: ctx.actorRole,
          points: Math.max(0, input.pointsDelta),
          lifetimePoints: Math.max(0, input.pointsDelta),
          rank: rank0.label,
          rankLevel: 1,
        },
      });

  const nextPoints = Math.max(0, wallet.points);
  const prevRank = wallet.rank;
  const rank = rankByPoints(nextPoints);
  const rankChanged = prevRank !== rank.label;

  const updated = await tx.ztPointWallet.update({
    where: { id: wallet.id },
    data: {
      points: nextPoints,
      rank: rank.label,
      rankLevel: rank.minPoints,
      lastRankChangedAt: rankChanged ? new Date() : wallet.lastRankChangedAt,
    },
  });

  await tx.ztPointLedger.create({
    data: {
      actorRole: ctx.actorRole,
      userId: ctx.userId,
      actorName:
        String(input.actorName ?? ctx.actorName).trim() || ctx.actorName,
      action: input.action,
      points: input.pointsDelta,
      balanceAfter: updated.points,
      rankAfter: rank.label,
      refType: input.refType ?? "",
      refId: input.refId ?? "",
    },
  });

  if (rankChanged) {
    await tx.ztRankChangeLog.create({
      data: {
        actorRole: ctx.actorRole,
        userId: ctx.userId,
        oldRank: prevRank || rank0.label,
        newRank: rank.label,
        points: updated.points,
        reason: input.reason ?? input.action,
      },
    });
  }

  return { wallet: updated, rankLabel: rank.label, rankChanged };
}

export async function readUserProgress(
  prisma: PrismaClient,
  userId?: string | null,
) {
  if (!userId) return null;
  const wallet = await prisma.ztPointWallet.findUnique({
    where: { userId },
    select: {
      points: true,
      lifetimePoints: true,
      rank: true,
      lastRankChangedAt: true,
      updatedAt: true,
    },
  });
  if (!wallet) return null;
  const current = rankByPoints(wallet.points);
  const next = [200, 500, 1000, 2000, 4000, 7000, 11000].find(
    (x) => x > wallet.points,
  );
  return {
    points: wallet.points,
    lifetimePoints: wallet.lifetimePoints,
    rank: wallet.rank || current.label,
    nextRankAt: next ?? null,
    progressToNext: next ? Math.max(0, next - wallet.points) : 0,
    lastRankChangedAt: wallet.lastRankChangedAt,
    updatedAt: wallet.updatedAt,
  };
}

