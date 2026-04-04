import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ztRoleFromRequest } from "@/lib/http";
import { getRequestUserContext } from "@/lib/request-user";
import { applyPointsAndSyncRank } from "@/lib/zt-points";
import { ensureZtBootstrap } from "@/lib/zt-bootstrap";
import { actorRoleCandidatesForZt } from "@/lib/zt-ranks";

function randomCode() {
  return `RDM-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export async function GET(req: Request) {
  try {
    await ensureZtBootstrap();
    const ctx = getRequestUserContext(req);
    if (ctx.userId) {
      const rows = ctx.isAdminLike
        ? await prisma.ztRedemption.findMany({
            orderBy: { createdAt: "desc" },
            take: 50,
          })
        : await prisma.ztRedemption.findMany({
            where: { userId: ctx.userId },
            orderBy: { createdAt: "desc" },
            take: 20,
          });
      return NextResponse.json({ items: rows });
    }
    const role = ztRoleFromRequest(req);
    const roles = actorRoleCandidatesForZt(role);
    // keep role-specific history for non-admin/GM views
    const where =
      role === "GENERAL" || role === "ADMIN" || role === "SUPERADMIN"
        ? undefined
        : { actorRole: { in: roles } };
    const rows = await prisma.ztRedemption.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return NextResponse.json({ items: rows });
  } catch (error) {
    return NextResponse.json(
      {
        error: "redemptions_unavailable",
        message:
          error instanceof Error ? error.message : "redemptions unavailable",
      },
      { status: 503 },
    );
  }
}

export async function POST(req: Request) {
  await ensureZtBootstrap();
  const ctx = getRequestUserContext(req);
  const role = ztRoleFromRequest(req);
  const body = (await req.json()) as {
    item?: string;
    pointsCost?: number;
  };
  const item = (body.item ?? "").trim();
  const pointsCost = Math.max(1, Number(body.pointsCost ?? 100));
  if (!item) {
    return NextResponse.json({ error: "item required" }, { status: 400 });
  }

  const wallet = ctx.userId
    ? await prisma.ztPointWallet.findUnique({ where: { userId: ctx.userId } })
    : await prisma.ztPointWallet.findUnique({ where: { actorRole: role } });
  const current = wallet?.points ?? 0;
  if (current < pointsCost) {
    return NextResponse.json({ error: "insufficient points" }, { status: 400 });
  }

  const data = await prisma.$transaction(async (tx) => {
    const pointsState = await applyPointsAndSyncRank(tx, {
      userId: ctx.userId,
      actorRole: role,
      pointsDelta: -pointsCost,
      action: "REDEEM_REQUEST",
      reason: "积分兑换申请",
      refType: "REDEMPTION",
    });
    const redemption = await tx.ztRedemption.create({
      data: {
        actorRole: ctx.userId ? ctx.ztRole : role,
        userId: ctx.userId,
        actorName: ctx.userEmail ?? "",
        rankAtRequest: pointsState.rankLabel,
        item,
        pointsCost,
        redeemCode: randomCode(),
        status: "REQUESTED",
      },
    });
    return { redemption, walletPoints: pointsState.wallet.points };
  });

  return NextResponse.json(data);
}
