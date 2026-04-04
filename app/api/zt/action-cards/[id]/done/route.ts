import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { demoRoleFromRequest } from "@/lib/http";
import { ensureZtBootstrap } from "@/lib/zt-bootstrap";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  await ensureZtBootstrap();
  const { id } = await params;
  const actorRole = demoRoleFromRequest(req);

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

  await prisma.$transaction(async (tx) => {
    await tx.ztActionCard.update({
      where: { id: card.id },
      data: { status: "DONE" },
    });

    await tx.ztPointWallet.upsert({
      where: { actorRole },
      update: { points: { increment: card.rewardPoints } },
      create: { actorRole, points: card.rewardPoints },
    });

    await tx.ztPointLedger.create({
      data: {
        actorRole,
        action: "ACTION_DONE",
        points: card.rewardPoints,
        refType: "ACTION_CARD",
        refId: card.id,
      },
    });
  });

  return NextResponse.json({ ok: true, points: card.rewardPoints });
}
