import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { demoRoleFromRequest } from "@/lib/http";
import { getRequestUserContext } from "@/lib/request-user";
import { applyPointsAndSyncRank } from "@/lib/zt-points";
import { ensureZtBootstrap } from "@/lib/zt-bootstrap";

export async function GET(req: Request) {
  await ensureZtBootstrap();
  const role = demoRoleFromRequest(req);
  const rows = await prisma.ztSubmission.findMany({
    where:
      role === "GM" || role === "ADMIN" ? undefined : { actorRole: role },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ items: rows });
}

export async function POST(req: Request) {
  await ensureZtBootstrap();
  const role = demoRoleFromRequest(req);
  const uctx = getRequestUserContext(req);
  const body = (await req.json()) as {
    taskId?: string;
    title?: string;
    content?: string;
    region?: string;
    format?: string;
    signalType?: string;
  };

  const title = String(body.title ?? "").trim();
  const content = String(body.content ?? "").trim();
  if (!title || !content) {
    return NextResponse.json({ error: "title/content required" }, { status: 400 });
  }

  const created = await prisma.$transaction(async (tx) => {
    const submission = await tx.ztSubmission.create({
      data: {
        taskId: body.taskId ? String(body.taskId) : null,
        title,
        content,
        signalType: String(body.signalType ?? "tactical"),
        region: String(body.region ?? ""),
        format: String(body.format ?? "text"),
        userId: uctx.userId,
        actorName: uctx.userEmail ?? "",
        actorRole: role,
        status: "APPROVED",
        pointsGranted: 8,
      },
    });

    if (body.taskId) {
      await tx.ztBountyTask.update({
        where: { id: String(body.taskId) },
        data: { status: "CLAIMED" },
      });
    }

    const wallet = await applyPointsAndSyncRank(tx, {
      userId: uctx.userId,
      actorRole: role,
      pointsDelta: 8,
      action: "SUBMISSION_APPROVED",
      reason: "情报提交审核通过",
      refType: "submission",
      refId: submission.id,
    });

    return { submission, wallet };
  });

  return NextResponse.json(created);
}
