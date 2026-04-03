import { NextResponse } from "next/server";
import {
  normalizeCompassThresholds,
} from "@/lib/compass-quadrant";
import {
  tryGetCompassQuadrantThresholdRow,
  upsertCompassQuadrantThresholdSafe,
} from "@/lib/load-compass-quadrant-threshold";
import { ADMIN_API_FORBIDDEN } from "@/lib/api-messages";
import { canAccessConsoleRules } from "@/lib/demo-role-modules";
import { demoRoleFromRequest } from "@/lib/http";

const SINGLETON_ID = "default";

export async function GET(req: Request) {
  const role = demoRoleFromRequest(req);
  if (!canAccessConsoleRules(role)) {
    return NextResponse.json({ error: ADMIN_API_FORBIDDEN }, { status: 403 });
  }

  const r = await tryGetCompassQuadrantThresholdRow();
  return NextResponse.json({
    id: r.id,
    marginHighPct: r.marginHighPct,
    growthHighPct: r.growthHighPct,
    updatedAt: r.updatedAt,
    persisted: r.persisted,
  });
}

export async function PATCH(req: Request) {
  const role = demoRoleFromRequest(req);
  if (!canAccessConsoleRules(role)) {
    return NextResponse.json({ error: ADMIN_API_FORBIDDEN }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "无效 JSON" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "请求体无效" }, { status: 400 });
  }
  const { marginHighPct, growthHighPct } = body as Record<string, unknown>;
  const norm = normalizeCompassThresholds(marginHighPct, growthHighPct);
  if (!norm) {
    return NextResponse.json(
      { error: "阈值须为 0–100 之间的数字" },
      { status: 400 },
    );
  }

  const result = await upsertCompassQuadrantThresholdSafe(norm);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 503 });
  }

  return NextResponse.json({
    id: SINGLETON_ID,
    marginHighPct: norm.marginHighPct,
    growthHighPct: norm.growthHighPct,
    updatedAt: result.updatedAt,
    persisted: true,
  });
}
