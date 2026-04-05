import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequestUserContext } from "@/lib/request-user";

export const dynamic = "force-dynamic";

type PatchPayload = {
  id?: string;
  status?: string;
  verifyNote?: string;
};

const ALLOWED_STATUSES = new Set([
  "REQUESTED",
  "REVIEWING",
  "APPROVED",
  "FULFILLED",
  "REJECTED",
]);

export async function GET(req: Request) {
  const ctx = getRequestUserContext(req);
  if (!ctx.isAdminLike) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const rows = await prisma.ztRedemption.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ items: rows });
}

export async function PATCH(req: Request) {
  const ctx = getRequestUserContext(req);
  if (!ctx.isAdminLike) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = (await req.json().catch(() => null)) as PatchPayload | null;
  if (!body?.id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  const status = String(body.status ?? "REVIEWING")
    .trim()
    .toUpperCase();
  if (!ALLOWED_STATUSES.has(status)) {
    return NextResponse.json(
      { error: "invalid status" },
      { status: 400 },
    );
  }
  const row = await prisma.ztRedemption.update({
    where: { id: body.id },
    data: {
      status,
      verifiedAt:
        status === "APPROVED" || status === "FULFILLED"
          ? new Date()
          : null,
      actorName:
        status === "REJECTED" && body.verifyNote
          ? `审核备注:${body.verifyNote}`.slice(0, 120)
          : undefined,
    },
  });
  return NextResponse.json({ ok: true, item: row });
}
