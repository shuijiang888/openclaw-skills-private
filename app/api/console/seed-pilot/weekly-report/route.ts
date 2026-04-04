import { NextResponse } from "next/server";
import { ADMIN_API_FORBIDDEN } from "@/lib/api-messages";
import { demoRoleFromRequest } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { canViewSeedPilot } from "@/lib/seed-pilot-permissions";
import type { PilotStage } from "@/lib/seed-pilot";
import { computeSeedPilotSlaState } from "@/lib/seed-pilot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function escapeCsv(v: string): string {
  if (/[",\n]/.test(v)) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

export async function GET(req: Request) {
  const role = demoRoleFromRequest(req);
  if (!canViewSeedPilot(role)) {
    return NextResponse.json({ error: ADMIN_API_FORBIDDEN }, { status: 403 });
  }

  const rows = await prisma.seedPilotUser.findMany({
    orderBy: [{ pilotStage: "asc" }, { lastActivityAt: "desc" }],
  });

  const header = [
    "name",
    "email",
    "role",
    "ownerRole",
    "pilotStage",
    "feedbackScore",
    "issueCount",
    "todoCount",
    "invitedAt",
    "activatedAt",
    "firstFeedbackAt",
    "lastActivityAt",
    "slaState",
    "slaHint",
    "notes",
  ];

  const lines = [header.join(",")];
  for (const r of rows) {
    const sla = computeSeedPilotSlaState({
      stage: r.pilotStage as PilotStage,
      invitedAt: r.invitedAt,
      activatedAt: r.activatedAt,
      lastActivityAt: r.lastActivityAt,
    });
    const row = [
      r.name,
      r.email,
      r.role,
      r.ownerRole,
      r.pilotStage,
      r.feedbackScore == null ? "" : String(r.feedbackScore),
      String(r.issueCount),
      String(r.todoCount),
      r.invitedAt.toISOString(),
      r.activatedAt?.toISOString() ?? "",
      r.firstFeedbackAt?.toISOString() ?? "",
      r.lastActivityAt.toISOString(),
      sla.isOverdue ? "OVERDUE" : "ON_TRACK",
      sla.label,
      r.notes,
    ].map((v) => escapeCsv(v));
    lines.push(row.join(","));
  }
  const csv = `${lines.join("\n")}\n`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="seed-pilot-weekly-report.csv"`,
      "cache-control": "no-store",
    },
  });
}
