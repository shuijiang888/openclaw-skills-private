import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canAccessConsoleRules } from "@/lib/demo-role-modules";
import { ADMIN_API_FORBIDDEN } from "@/lib/api-messages";
import { demoRoleFromRequest } from "@/lib/http";
import { parseCompassAlertRulesCsvImport } from "@/lib/parse-compass-alert-rules-csv";

export const runtime = "nodejs";

export async function POST(req: Request) {
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

  const csvText = (body as { csvText?: unknown }).csvText;
  if (typeof csvText !== "string") {
    return NextResponse.json({ error: "需提供 csvText 字符串" }, { status: 400 });
  }

  const parsed = parseCompassAlertRulesCsvImport(csvText);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const createdResult = await prisma.compassAlertRule.createMany({
    data: parsed.rows.map((r) => ({
      conditionLabel: r.conditionLabel,
      actionLabel: r.actionLabel,
      sortOrder: r.sortOrder,
    })),
  });

  return NextResponse.json({
    created: createdResult.count,
    skipped: parsed.skipped,
    totalInput: parsed.rows.length + parsed.skipped,
  });
}

