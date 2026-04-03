import { NextResponse } from "next/server";
import { ADMIN_API_FORBIDDEN } from "@/lib/api-messages";
import { prisma } from "@/lib/prisma";
import { demoRoleFromRequest } from "@/lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  if (demoRoleFromRequest(req) !== "ADMIN") {
    return NextResponse.json({ error: ADMIN_API_FORBIDDEN }, { status: 403 });
  }

  try {
    const rows = await prisma.agentAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json(
      rows.map((r) => ({
        id: r.id,
        requestId: r.requestId,
        route: r.route,
        action: r.action,
        actorRole: r.actorRole,
        meta:
          (() => {
            try {
              return JSON.parse(r.metaJson) as Record<string, unknown>;
            } catch {
              return {};
            }
          })(),
        createdAt: r.createdAt.toISOString(),
      })),
    );
  } catch {
    return NextResponse.json([]);
  }
}
