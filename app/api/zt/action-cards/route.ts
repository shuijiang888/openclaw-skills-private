import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { demoRoleFromRequest } from "@/lib/http";
import { getRequestUserContext } from "@/lib/request-user";
import { ensureZtBootstrap } from "@/lib/zt-bootstrap";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  await ensureZtBootstrap();
  const ctx = getRequestUserContext(req);
  const role = demoRoleFromRequest(req);
  const rows = await prisma.ztActionCard.findMany({
    where: { assignedRole: ctx.userId ? ctx.ztRole : role },
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
    take: 10,
  });
  return NextResponse.json({ role: ctx.userId ? ctx.ztRole : role, items: rows });
}

export async function POST(req: Request) {
  await ensureZtBootstrap();
  const role = demoRoleFromRequest(req);
  const body = (await req.json()) as Record<string, unknown>;
  const title = String(body.title ?? "").trim();
  const reason = String(body.reason ?? "").trim();
  const suggestion = String(body.suggestion ?? "").trim();
  const priority = String(body.priority ?? "P1").toUpperCase();
  const rewardPoints = Number(body.rewardPoints ?? 10);

  if (!title || !reason || !suggestion) {
    return NextResponse.json(
      { error: "title/reason/suggestion are required" },
      { status: 400 },
    );
  }

  const row = await prisma.ztActionCard.create({
    data: {
      title,
      reason,
      suggestion,
      priority,
      assignedRole: role,
      rewardPoints,
    },
  });
  return NextResponse.json(row, { status: 201 });
}
