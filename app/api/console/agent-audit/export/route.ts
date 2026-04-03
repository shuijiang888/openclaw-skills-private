import type { AgentAuditLog } from "@prisma/client";
import { NextResponse } from "next/server";
import { demoRoleFromRequest } from "@/lib/http";
import { csvLine, withUtf8Bom } from "@/lib/csv-format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HEADER = [
  "id",
  "requestId",
  "route",
  "action",
  "actorRole",
  "createdAtIso",
  "metaJson",
] as const;

/** 管理员导出智能体审计（须 x-demo-role: ADMIN），最多 5000 条，新在前 */
export async function GET(req: Request) {
  if (demoRoleFromRequest(req) !== "ADMIN") {
    return NextResponse.json(
      { error: "需要管理员演示身份（x-demo-role: ADMIN）" },
      { status: 403 },
    );
  }

  let rows: AgentAuditLog[] = [];
  try {
    rows = await prisma.agentAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 5000,
    });
  } catch {
    rows = [];
  }

  let csv = csvLine([...HEADER]);
  for (const r of rows) {
    csv += csvLine([
      r.id,
      r.requestId,
      r.route,
      r.action,
      r.actorRole,
      r.createdAt.toISOString(),
      r.metaJson,
    ]);
  }

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(withUtf8Bom(csv), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="profit-agent-audit-${stamp}.csv"`,
    },
  });
}
