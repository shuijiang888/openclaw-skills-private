import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequestUserContext } from "@/lib/request-user";
import { getZtSystemConfig, sanitizeZtSystemConfigPatch } from "@/lib/zt-system-config";
import { ensureZtBootstrap } from "@/lib/zt-bootstrap";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  await ensureZtBootstrap();
  const ctx = getRequestUserContext(req);
  if (!ctx.isAdminLike) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  return NextResponse.json(await getZtSystemConfig());
}

export async function PATCH(req: Request) {
  await ensureZtBootstrap();
  const ctx = getRequestUserContext(req);
  if (!ctx.isAdminLike) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const patch = sanitizeZtSystemConfigPatch(body);
  const row = await prisma.ztSystemConfig.upsert({
    where: { id: "default" },
    update: { ...patch, updatedByUserId: ctx.userId },
    create: { id: "default", ...patch, updatedByUserId: ctx.userId },
  });
  return NextResponse.json(row);
}
