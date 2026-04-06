import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureZtBootstrap } from "@/lib/zt-bootstrap";
import { getRequestUserContext } from "@/lib/request-user";
import { ztRoleFromRequest } from "@/lib/http";
import { actorRoleCandidatesForZt } from "@/lib/zt-ranks";

type BountyTaskStatus =
  | "OPEN"
  | "CLAIMED"
  | "REVIEWING"
  | "APPROVED"
  | "REJECTED";

const ALL_TASK_STATUSES = new Set<BountyTaskStatus>([
  "OPEN",
  "CLAIMED",
  "REVIEWING",
  "APPROVED",
  "REJECTED",
]);

function managerAllowedTransitions(current: BountyTaskStatus): BountyTaskStatus[] {
  if (current === "OPEN") return ["CLAIMED", "REJECTED"];
  if (current === "CLAIMED") return ["REVIEWING", "OPEN", "REJECTED"];
  if (current === "REVIEWING") return ["APPROVED", "REJECTED", "CLAIMED"];
  if (current === "APPROVED") return ["OPEN"];
  return ["OPEN", "CLAIMED"];
}

function allowedTransitions(current: BountyTaskStatus, isZtManager: boolean): BountyTaskStatus[] {
  if (!isZtManager) {
    return current === "OPEN" ? ["CLAIMED"] : [];
  }
  return managerAllowedTransitions(current);
}

export async function GET(req: Request) {
  try {
    await ensureZtBootstrap();
    const ctx = getRequestUserContext(req);
    const role = ztRoleFromRequest(req);
    const rows = await prisma.ztBountyTask.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({
      items: rows.map((row) => ({
        ...row,
        allowedTransitions: ALL_TASK_STATUSES.has(row.status as BountyTaskStatus)
          ? allowedTransitions(row.status as BountyTaskStatus, ctx.isZtManager)
          : [],
      })),
      actorScope: ctx.userId ? ctx.ztRole : role,
      isManager: ctx.isZtManager,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "bounty_tasks_unavailable",
        message:
          error instanceof Error ? error.message : "bounty tasks unavailable",
      },
      { status: 503 },
    );
  }
}

export async function PATCH(req: Request) {
  try {
    await ensureZtBootstrap();
    const ctx = getRequestUserContext(req);
    const role = ztRoleFromRequest(req);
    const body = (await req.json().catch(() => null)) as
      | { taskId?: string; status?: string }
      | null;

    const taskId = String(body?.taskId ?? "").trim();
    const status = String(body?.status ?? "")
      .trim()
      .toUpperCase();
    if (!taskId) {
      return NextResponse.json({ error: "taskId required" }, { status: 400 });
    }

    if (!ALL_TASK_STATUSES.has(status as BountyTaskStatus)) {
      return NextResponse.json(
        { error: "invalid status, expected OPEN/CLAIMED/REVIEWING/APPROVED/REJECTED" },
        { status: 400 },
      );
    }

    const where = ctx.isZtManager
      ? { id: taskId }
      : {
          id: taskId,
          OR: [{ status: "OPEN" }, { status: "CLAIMED" }],
        };

    const exists = await prisma.ztBountyTask.findFirst({ where });
    if (!exists) {
      return NextResponse.json({ error: "task not found or forbidden" }, { status: 404 });
    }

    if (!ALL_TASK_STATUSES.has(exists.status as BountyTaskStatus)) {
      return NextResponse.json({ error: "task status invalid" }, { status: 400 });
    }
    const nextAllowed = allowedTransitions(
      exists.status as BountyTaskStatus,
      ctx.isZtManager,
    );
    if (!nextAllowed.includes(status as BountyTaskStatus)) {
      return NextResponse.json(
        {
          error: `invalid transition: ${exists.status} -> ${status}, expected: ${nextAllowed.join("/") || "none"}`,
        },
        { status: ctx.isZtManager ? 400 : 403 },
      );
    }

    const row = await prisma.ztBountyTask.update({
      where: { id: taskId },
      data: { status },
    });

    const myRoles = actorRoleCandidatesForZt(role);
    return NextResponse.json({
      ok: true,
      item: row,
      actorScope: ctx.userId ? ctx.ztRole : myRoles,
      allowedTransitions: ALL_TASK_STATUSES.has(row.status as BountyTaskStatus)
        ? allowedTransitions(row.status as BountyTaskStatus, ctx.isZtManager)
        : [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "bounty_task_update_failed",
        message:
          error instanceof Error ? error.message : "bounty task update failed",
      },
      { status: 503 },
    );
  }
}

export async function POST(req: Request) {
  try {
    await ensureZtBootstrap();
    const ctx = getRequestUserContext(req);
    if (!ctx.isZtManager) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const body = (await req.json().catch(() => null)) as
      | {
          intelDefId?: string;
          title?: string;
          description?: string;
          rewardPoints?: number;
          deadlineAt?: string;
        }
      | null;
    const intelDefId = String(body?.intelDefId ?? "").trim();
    if (!intelDefId) {
      return NextResponse.json({ error: "intelDefId required" }, { status: 400 });
    }
    const def = await prisma.ztIntelDefinition.findFirst({
      where: { id: intelDefId, isActive: true },
    });
    if (!def) {
      return NextResponse.json(
        { error: "invalid intelDefId (definition not found or inactive)" },
        { status: 400 },
      );
    }

    const title = String(body?.title ?? "").trim();
    const description = String(body?.description ?? "").trim();
    if (!title || !description) {
      return NextResponse.json(
        { error: "title/description required" },
        { status: 400 },
      );
    }
    const rewardPoints = Number(body?.rewardPoints ?? def.defaultRewardPoints);
    const safeReward = Number.isFinite(rewardPoints)
      ? Math.max(1, Math.min(500, Math.floor(rewardPoints)))
      : def.defaultRewardPoints;
    const deadlineAtRaw = String(body?.deadlineAt ?? "").trim();
    const deadlineAt = deadlineAtRaw ? new Date(deadlineAtRaw) : null;
    if (deadlineAt && Number.isNaN(deadlineAt.getTime())) {
      return NextResponse.json(
        { error: "deadlineAt invalid datetime string" },
        { status: 400 },
      );
    }

    const task = await prisma.ztBountyTask.create({
      data: {
        intelDefId: def.id,
        title,
        description,
        taskType: def.category.toLowerCase(),
        rewardPoints: safeReward,
        status: "OPEN",
        deadlineAt,
      },
    });
    return NextResponse.json({ ok: true, item: task }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: "bounty_task_create_failed",
        message:
          error instanceof Error ? error.message : "bounty task create failed",
      },
      { status: 503 },
    );
  }
}

