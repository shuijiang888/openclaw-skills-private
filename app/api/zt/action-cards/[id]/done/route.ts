import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { demoRoleFromRequest } from "@/lib/http";
import { getRequestUserContext } from "@/lib/request-user";
import { applyPointsAndSyncRank } from "@/lib/zt-points";
import { ensureZtBootstrap } from "@/lib/zt-bootstrap";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  await ensureZtBootstrap();
  const { id } = await params;
  const actorRole = demoRoleFromRequest(req);
  const userCtx = getRequestUserContext(req);

  const card = await prisma.ztActionCard.findUnique({ where: { id } });
  if (!card) {
    return NextResponse.json({ error: "Action card not found" }, { status: 404 });
  }
  if (card.assignedRole !== actorRole) {
    return NextResponse.json({ error: "Card not assigned to current role" }, { status: 403 });
  }
  if (card.status === "DONE") {
    return NextResponse.json({ ok: true, points: 0, alreadyDone: true });
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.ztActionCard.update({
      where: { id: card.id },
      data: { status: "DONE" },
    });
    return applyPointsAndSyncRank(tx, {
      userId: userCtx.userId,
      actorRole,
      pointsDelta: card.rewardPoints,
      action: "ACTION_DONE",
      reason: "完成行动卡",
      refType: "ACTION_CARD",
      refId: card.id,
    });
  });

  return NextResponse.json({
    ok: true,
    points: card.rewardPoints,
    rank: result.rankLabel,
    wallet: {
      points: result.wallet.points,
      lifetimePoints: result.wallet.lifetimePoints,
    },
  });
}
