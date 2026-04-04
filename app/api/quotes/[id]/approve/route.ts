import { NextResponse } from "next/server";
import {
  newRequestId,
  withRequestIdHeader,
  writeAgentAuditSafe,
} from "@/lib/agent-audit";
import { prisma } from "@/lib/prisma";
import { canApprove, parseDemoRole, type DemoRole } from "@/lib/approval";
import { appendTimeline } from "@/lib/timeline";
import { demoRoleFromRequest } from "@/lib/http";
import { enrichProject } from "@/lib/serialize";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  const requestId = newRequestId();
  const rh = withRequestIdHeader(requestId);
  const { id } = await params;
  const route = `POST /api/quotes/${id}/approve`;

  const quote = await prisma.quote.findUnique({
    where: { id },
    include: { project: true },
  });
  if (!quote) {
    return NextResponse.json({ error: "报价不存在" }, { status: 404, headers: rh });
  }
  if (!quote.pendingRole) {
    return NextResponse.json(
      { error: "当前无需 Deal Desk 批复" },
      { status: 400, headers: rh },
    );
  }

  const actor = demoRoleFromRequest(req);
  const needed = parseDemoRole(quote.pendingRole) as DemoRole;
  if (!canApprove(actor, needed)) {
    await writeAgentAuditSafe({
      requestId,
      route,
      action: "approve_denied",
      req,
      meta: {
        quoteId: id,
        pendingRole: quote.pendingRole,
        actor,
      },
    });
    return NextResponse.json(
      {
        error: "权限不足",
        detail: `需要 ${quote.pendingRole} 及以上角色，当前 ${actor}`,
      },
      { status: 403, headers: rh },
    );
  }

  const approvedPrice = quote.counterPrice ?? quote.suggestedPrice;
  const timelineJson = appendTimeline(quote.timelineJson, {
    kind: "approve",
    title: "Deal Desk 批复通过",
    detail: `成交价 ${approvedPrice}（操作角色 ${actor}）`,
  });

  await prisma.$transaction([
    prisma.quote.update({
      where: { id },
      data: {
        approvedPrice,
        pendingRole: null,
        timelineJson,
      },
    }),
    prisma.project.update({
      where: { id: quote.projectId },
      data: { status: "APPROVED" },
    }),
  ]);

  await writeAgentAuditSafe({
    requestId,
    route,
    action: "approve_ok",
    req,
    meta: {
      quoteId: id,
      projectId: quote.projectId,
      approvedPrice,
      actor,
    },
  });

  const project = await prisma.project.findUnique({
    where: { id: quote.projectId },
    include: { customer: true, quote: true },
  });
  if (!project) {
    return NextResponse.json(
      { error: "项目不存在" },
      { status: 500, headers: rh },
    );
  }
  return NextResponse.json(enrichProject(project), { headers: rh });
}
