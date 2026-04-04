import { NextResponse } from "next/server";
import type { PilotStage } from "@/lib/seed-pilot";
import { ADMIN_API_FORBIDDEN } from "@/lib/api-messages";
import { demoRoleFromRequest } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import {
  canEditSeedPilotScoring,
  canUpdateSeedPilotProgress,
  canViewSeedPilot,
} from "@/lib/seed-pilot-permissions";
import {
  calcSeedPilotSlaOverdueDays,
  defaultSeedPilotSlaByStage,
  seedPilotSlaLabel,
} from "@/lib/seed-pilot";

const VALID_STAGES: PilotStage[] = [
  "INVITED",
  "ACTIVATED",
  "FEEDBACK",
  "DONE",
  "DROPPED",
];

function parseDate(input: unknown): Date | null {
  if (!input) return null;
  if (typeof input !== "string") return null;
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const role = demoRoleFromRequest(req);
  if (!canViewSeedPilot(role)) {
    return NextResponse.json({ error: ADMIN_API_FORBIDDEN }, { status: 403 });
  }

  const rows = await prisma.seedPilotUser.findMany({
    orderBy: [{ pilotStage: "asc" }, { lastActivityAt: "desc" }],
  });

  const summary = {
    total: rows.length,
    invited: rows.filter((r) => r.pilotStage === "INVITED").length,
    activated: rows.filter((r) => r.pilotStage === "ACTIVATED").length,
    feedback: rows.filter((r) => r.pilotStage === "FEEDBACK").length,
    done: rows.filter((r) => r.pilotStage === "DONE").length,
    dropped: rows.filter((r) => r.pilotStage === "DROPPED").length,
    avgScore:
      rows.filter((r) => r.feedbackScore != null).length > 0
        ? Math.round(
            (rows.reduce((s, r) => s + (r.feedbackScore ?? 0), 0) /
              rows.filter((r) => r.feedbackScore != null).length) *
              10,
          ) / 10
        : null,
    totalIssues: rows.reduce((s, r) => s + r.issueCount, 0),
    totalTodos: rows.reduce((s, r) => s + r.todoCount, 0),
  };

  return NextResponse.json({
    summary,
    rows: rows.map((r) => ({
      id: r.id,
      email: r.email,
      name: r.name,
      role: r.role,
      ownerRole: r.ownerRole,
      pilotStage: r.pilotStage,
      invitedAt: r.invitedAt.toISOString(),
      activatedAt: r.activatedAt?.toISOString() ?? null,
      firstFeedbackAt: r.firstFeedbackAt?.toISOString() ?? null,
      lastActivityAt: r.lastActivityAt.toISOString(),
      feedbackScore: r.feedbackScore,
      issueCount: r.issueCount,
      todoCount: r.todoCount,
      notes: r.notes,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      slaDays: defaultSeedPilotSlaByStage[r.pilotStage as PilotStage],
      slaLabel: seedPilotSlaLabel(r.pilotStage as PilotStage),
      overdueDays: calcSeedPilotSlaOverdueDays({
        stage: r.pilotStage as PilotStage,
        invitedAt: r.invitedAt,
        activatedAt: r.activatedAt,
        lastActivityAt: r.lastActivityAt,
      }),
    })),
  });
}

export async function PATCH(req: Request) {
  const role = demoRoleFromRequest(req);
  if (!canUpdateSeedPilotProgress(role)) {
    return NextResponse.json({ error: ADMIN_API_FORBIDDEN }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as
    | {
        id?: string;
        pilotStage?: string;
        ownerRole?: string;
        feedbackScore?: number | null;
        issueCount?: number;
        todoCount?: number;
        notes?: string;
        activatedAt?: string | null;
        firstFeedbackAt?: string | null;
      }
    | null;

  if (!body?.id || typeof body.id !== "string") {
    return NextResponse.json({ error: "缺少 id" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};
  const canEditAll = canEditSeedPilotScoring(role);
  const touchedRestricted =
    body.ownerRole !== undefined ||
    body.feedbackScore !== undefined ||
    body.issueCount !== undefined ||
    body.todoCount !== undefined;
  if (!canEditAll && touchedRestricted) {
    return NextResponse.json(
      { error: "当前角色仅可更新阶段与备注；评分/问题/待办与 owner 需 VP。" },
      { status: 403 },
    );
  }
  if (body.pilotStage !== undefined) {
    if (
      typeof body.pilotStage !== "string" ||
      !VALID_STAGES.includes(body.pilotStage as PilotStage)
    ) {
      return NextResponse.json({ error: "pilotStage 无效" }, { status: 400 });
    }
    updateData.pilotStage = body.pilotStage;
  }
  if (body.ownerRole !== undefined) {
    if (typeof body.ownerRole !== "string" || body.ownerRole.length > 30) {
      return NextResponse.json({ error: "ownerRole 无效" }, { status: 400 });
    }
    updateData.ownerRole = body.ownerRole.trim().toUpperCase();
  }
  if (body.feedbackScore !== undefined) {
    if (
      body.feedbackScore !== null &&
      (!Number.isFinite(body.feedbackScore) ||
        body.feedbackScore < 1 ||
        body.feedbackScore > 5)
    ) {
      return NextResponse.json(
        { error: "feedbackScore 须为 1-5 或 null" },
        { status: 400 },
      );
    }
    updateData.feedbackScore = body.feedbackScore;
  }
  if (body.issueCount !== undefined) {
    if (!Number.isInteger(body.issueCount) || body.issueCount < 0) {
      return NextResponse.json({ error: "issueCount 须为非负整数" }, { status: 400 });
    }
    updateData.issueCount = body.issueCount;
  }
  if (body.todoCount !== undefined) {
    if (!Number.isInteger(body.todoCount) || body.todoCount < 0) {
      return NextResponse.json({ error: "todoCount 须为非负整数" }, { status: 400 });
    }
    updateData.todoCount = body.todoCount;
  }
  if (body.notes !== undefined) {
    if (typeof body.notes !== "string" || body.notes.length > 400) {
      return NextResponse.json({ error: "notes 最长 400 字符" }, { status: 400 });
    }
    updateData.notes = body.notes.trim();
  }
  if (body.activatedAt !== undefined) {
    updateData.activatedAt =
      body.activatedAt === null ? null : parseDate(body.activatedAt);
    if (body.activatedAt !== null && updateData.activatedAt === null) {
      return NextResponse.json({ error: "activatedAt 日期无效" }, { status: 400 });
    }
  }
  if (body.firstFeedbackAt !== undefined) {
    updateData.firstFeedbackAt =
      body.firstFeedbackAt === null ? null : parseDate(body.firstFeedbackAt);
    if (body.firstFeedbackAt !== null && updateData.firstFeedbackAt === null) {
      return NextResponse.json({ error: "firstFeedbackAt 日期无效" }, { status: 400 });
    }
  }

  const lastActivityCandidate =
    (updateData.firstFeedbackAt as Date | null | undefined) ??
    (updateData.activatedAt as Date | null | undefined);
  if (lastActivityCandidate) {
    updateData.lastActivityAt = lastActivityCandidate;
  } else {
    updateData.lastActivityAt = new Date();
  }

  const row = await prisma.seedPilotUser.update({
    where: { id: body.id },
    data: updateData,
  });

  return NextResponse.json({
    ok: true,
    row: {
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role,
      pilotStage: row.pilotStage,
      invitedAt: row.invitedAt.toISOString(),
      activatedAt: row.activatedAt?.toISOString() ?? null,
      firstFeedbackAt: row.firstFeedbackAt?.toISOString() ?? null,
      lastActivityAt: row.lastActivityAt.toISOString(),
      feedbackScore: row.feedbackScore,
      issueCount: row.issueCount,
      todoCount: row.todoCount,
      ownerRole: row.ownerRole,
      notes: row.notes,
      updatedAt: row.updatedAt.toISOString(),
    },
  });
}
