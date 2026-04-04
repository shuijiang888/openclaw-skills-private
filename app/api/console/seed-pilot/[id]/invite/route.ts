import { NextResponse } from "next/server";
import { ADMIN_API_FORBIDDEN } from "@/lib/api-messages";
import { demoRoleFromRequest } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import {
  canViewSeedPilot,
  canEditSeedPilotScoring,
} from "@/lib/seed-pilot-permissions";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  const role = demoRoleFromRequest(req);
  if (!canViewSeedPilot(role)) {
    return NextResponse.json({ error: ADMIN_API_FORBIDDEN }, { status: 403 });
  }
  const { id } = await params;

  const now = new Date();
  const row = await prisma.seedPilotUser.update({
    where: { id },
    data: {
      pilotStage: "INVITED",
      invitedAt: now,
      lastActivityAt: now,
      notes: "已重新发送邀请，请跟进激活。",
    },
  });

  return NextResponse.json({
    ok: true,
    row: {
      id: row.id,
      pilotStage: row.pilotStage,
      invitedAt: row.invitedAt.toISOString(),
      lastActivityAt: row.lastActivityAt.toISOString(),
      notes: row.notes,
    },
  });
}

export async function PATCH(req: Request, { params }: Params) {
  const role = demoRoleFromRequest(req);
  // Kept for backward compatibility with potential callers.
  if (!canEditSeedPilotScoring(role)) {
    return NextResponse.json({ error: ADMIN_API_FORBIDDEN }, { status: 403 });
  }
  const { id } = await params;

  const now = new Date();
  const row = await prisma.seedPilotUser.update({
    where: { id },
    data: {
      pilotStage: "INVITED",
      invitedAt: now,
      lastActivityAt: now,
      notes: "已重新发送邀请，请跟进激活。",
    },
  });

  return NextResponse.json({
    ok: true,
    row: {
      id: row.id,
      pilotStage: row.pilotStage,
      invitedAt: row.invitedAt.toISOString(),
      lastActivityAt: row.lastActivityAt.toISOString(),
      notes: row.notes,
    },
  });
}
