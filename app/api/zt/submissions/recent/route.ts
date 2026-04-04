import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { demoRoleFromRequest } from "@/lib/http";
import { ensureZtBootstrap } from "@/lib/zt-bootstrap";

export async function GET(req: Request) {
  await ensureZtBootstrap();
  const role = demoRoleFromRequest(req);
  const rows = await prisma.ztSubmission.findMany({
    where:
      role === "GM" || role === "ADMIN" ? undefined : { actorRole: role },
    orderBy: { createdAt: "desc" },
    take: 12,
  });
  return NextResponse.json({ items: rows });
}
