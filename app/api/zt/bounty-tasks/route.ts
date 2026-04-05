import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureZtBootstrap } from "@/lib/zt-bootstrap";
import { getRequestUserContext } from "@/lib/request-user";
import { ztRoleFromRequest } from "@/lib/http";
import { actorRoleCandidatesForZt } from "@/lib/zt-ranks";

export async function GET() {
  try {
    await ensureZtBootstrap();
    const rows = await prisma.ztBountyTask.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ items: rows });
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

    const allowedStatus = new Set([
      "OPEN",
      "CLAIMED",
      "REVIEWING",
      "APPROVED",
      "REJECTED",
    ]);
    if (!allowedStatus.has(status)) {
      return NextResponse.json(
        { error: "invalid status, expected OPEN/CLAIMED/REVIEWING/APPROVED/REJECTED" },
        { status: 400 },
      );
    }

    const where = ctx.isAdminLike
      ? { id: taskId }
      : {
          id: taskId,
          OR: [{ status: "OPEN" }, { status: "CLAIMED" }],
        };

    const exists = await prisma.ztBountyTask.findFirst({ where });
    if (!exists) {
      return NextResponse.json({ error: "task not found or forbidden" }, { status: 404 });
    }

    // 非管理员只能做 OPEN -> CLAIMED 的认领动作
    if (!ctx.isAdminLike && !(exists.status === "OPEN" && status === "CLAIMED")) {
      return NextResponse.json(
        { error: "forbidden transition for non-admin user" },
        { status: 403 },
      );
    }

    // 管理员可做全状态流转
    const row = await prisma.ztBountyTask.update({
      where: { id: taskId },
      data: { status },
    });

    const myRoles = actorRoleCandidatesForZt(role);
    return NextResponse.json({
      ok: true,
      item: row,
      actorScope: ctx.userId ? ctx.ztRole : myRoles,
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

