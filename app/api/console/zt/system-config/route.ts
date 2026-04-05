import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequestUserContext } from "@/lib/request-user";
import { getZtSystemConfig, sanitizeZtSystemConfigPatch } from "@/lib/zt-system-config";
import { ensureZtBootstrap } from "@/lib/zt-bootstrap";

export const dynamic = "force-dynamic";

function parseFeatures(raw: string): Record<string, boolean> {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      demoWorkspaceEnabled: parsed.demoWorkspaceEnabled !== false,
      bountyFlowEnabled: parsed.bountyFlowEnabled !== false,
      redemptionReviewEnabled: parsed.redemptionReviewEnabled !== false,
    };
  } catch {
    return {
      demoWorkspaceEnabled: true,
      bountyFlowEnabled: true,
      redemptionReviewEnabled: true,
    };
  }
}

export async function GET(req: Request) {
  await ensureZtBootstrap();
  const ctx = getRequestUserContext(req);
  if (!ctx.isAdminLike) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const config = await getZtSystemConfig();
  return NextResponse.json({
    ...config,
    features: parseFeatures(config.featuresJson),
  });
}

export async function PATCH(req: Request) {
  await ensureZtBootstrap();
  const ctx = getRequestUserContext(req);
  if (!ctx.isAdminLike) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const patch = sanitizeZtSystemConfigPatch(body);
  if (body.features && typeof body.features === "object") {
    const f = body.features as Record<string, unknown>;
    patch.featuresJson = JSON.stringify({
      demoWorkspaceEnabled: f.demoWorkspaceEnabled !== false,
      bountyFlowEnabled: f.bountyFlowEnabled !== false,
      redemptionReviewEnabled: f.redemptionReviewEnabled !== false,
    });
  }
  const row = await prisma.ztSystemConfig.upsert({
    where: { id: "default" },
    update: { ...patch, updatedByUserId: ctx.userId },
    create: { id: "default", ...patch, updatedByUserId: ctx.userId },
  });
  return NextResponse.json({
    ...row,
    features: parseFeatures(row.featuresJson),
  });
}
