import { NextResponse } from "next/server";
import { ADMIN_API_FORBIDDEN } from "@/lib/api-messages";
import {
  newRequestId,
  withRequestIdHeader,
  writeAgentAuditSafe,
} from "@/lib/agent-audit";
import { demoRoleFromRequest } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import {
  canViewSeedPilot,
} from "@/lib/seed-pilot-permissions";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  const requestId = newRequestId();
  const rh = withRequestIdHeader(requestId);
  const role = demoRoleFromRequest(req);
  if (!canViewSeedPilot(role)) {
    return NextResponse.json(
      { error: ADMIN_API_FORBIDDEN },
      { status: 403, headers: rh },
    );
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
  await writeAgentAuditSafe({
    requestId,
    route: `POST /api/console/seed-pilot/${id}/invite`,
    action: "seed_pilot_reinvite",
    req,
    meta: { seedPilotUserId: id, actorRole: role },
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
  }, { headers: rh });
}

export async function PATCH(req: Request, { params }: Params) {
  return POST(req, { params });
}
