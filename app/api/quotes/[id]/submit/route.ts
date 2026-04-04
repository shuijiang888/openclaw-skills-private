import { NextResponse } from "next/server";
import {
  newRequestId,
  withRequestIdHeader,
  writeAgentAuditSafe,
} from "@/lib/agent-audit";
import { prisma } from "@/lib/prisma";
import { discountPercent } from "@/lib/calc";
import { requiredRoleForDiscount } from "@/lib/approval";
import { appendTimeline } from "@/lib/timeline";
import { enrichProject } from "@/lib/serialize";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  const requestId = newRequestId();
  const rh = withRequestIdHeader(requestId);
  const { id } = await params;
  const route = `POST /api/quotes/${id}/submit`;

  const quote = await prisma.quote.findUnique({
    where: { id },
    include: { project: { include: { customer: true } } },
  });
  if (!quote) {
    return NextResponse.json({ error: "报价不存在" }, { status: 404, headers: rh });
  }

  const d = discountPercent(quote.suggestedPrice, quote.counterPrice);
  const reqRole = requiredRoleForDiscount(d);

  const timelineJson = appendTimeline(quote.timelineJson, {
    kind: "submit",
    title: "提交 Deal Desk",
    detail: `需 ${reqRole.label}；折扣约 ${(d * 100).toFixed(1)}%`,
  });

  await prisma.$transaction([
    prisma.quote.update({
      where: { id },
      data: {
        pendingRole: reqRole.role,
        timelineJson,
      },
    }),
    prisma.project.update({
      where: { id: quote.projectId },
      data: { status: "PENDING_APPROVAL" },
    }),
  ]);

  await writeAgentAuditSafe({
    requestId,
    route,
    action: "submit_approval",
    req,
    meta: {
      quoteId: id,
      projectId: quote.projectId,
      pendingRole: reqRole.role,
      discountApproxPct: Math.round(d * 1000) / 10,
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
