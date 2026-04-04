import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { demoRoleFromRequest } from "@/lib/http";
import { ensureZtBootstrap } from "@/lib/zt-bootstrap";

function randomCode() {
  return `RDM-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export async function GET(req: Request) {
  await ensureZtBootstrap();
  const role = demoRoleFromRequest(req);
  // keep role-specific history for non-admin/GM views
  const where =
    role === "GM" || role === "ADMIN" ? undefined : { actorRole: role };
  const rows = await prisma.ztRedemption.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return NextResponse.json({ items: rows });
}

export async function POST(req: Request) {
  await ensureZtBootstrap();
  const role = demoRoleFromRequest(req);
  const body = (await req.json()) as {
    item?: string;
    pointsCost?: number;
  };
  const item = (body.item ?? "").trim();
  const pointsCost = Math.max(1, Number(body.pointsCost ?? 100));
  if (!item) {
    return NextResponse.json({ error: "item required" }, { status: 400 });
  }

  const wallet = await prisma.ztPointWallet.findUnique({
    where: { actorRole: role },
  });
  const current = wallet?.points ?? 0;
  if (current < pointsCost) {
    return NextResponse.json({ error: "insufficient points" }, { status: 400 });
  }

  const redemption = await prisma.$transaction(async (tx) => {
    const updated = await tx.ztPointWallet.update({
      where: { actorRole: role },
      data: { points: { decrement: pointsCost } },
    });
    await tx.ztPointLedger.create({
      data: {
        actorRole: role,
        action: "REDEEM_REQUEST",
        points: -pointsCost,
        refType: "REDEMPTION",
      },
    });
    return tx.ztRedemption.create({
      data: {
        actorRole: role,
        item,
        pointsCost,
        redeemCode: randomCode(),
        status: "REQUESTED",
      },
    });
  });

  return NextResponse.json({ redemption, walletPoints: current - pointsCost });
}
