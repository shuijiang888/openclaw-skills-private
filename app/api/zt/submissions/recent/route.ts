import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ztRoleFromRequest } from "@/lib/http";
import { getRequestUserContext } from "@/lib/request-user";
import { ensureZtBootstrap } from "@/lib/zt-bootstrap";

export async function GET(req: Request) {
  try {
    await ensureZtBootstrap();
    const ctx = getRequestUserContext(req);
    const role = ztRoleFromRequest(req);
    const rows = await prisma.ztSubmission.findMany({
      where: ctx.isAdminLike
        ? undefined
        : ctx.userId
          ? { userId: ctx.userId }
          : { actorRole: role },
      orderBy: { createdAt: "desc" },
      take: 12,
    });
    return NextResponse.json({ items: rows });
  } catch (error) {
    return NextResponse.json(
      {
        error: "recent_submissions_unavailable",
        message:
          error instanceof Error ? error.message : "recent submissions unavailable",
      },
      { status: 503 },
    );
  }
}
