import { NextResponse } from "next/server";
import { ADMIN_API_FORBIDDEN } from "@/lib/api-messages";
import { prisma } from "@/lib/prisma";
import { canAccessConsoleRules } from "@/lib/demo-role-modules";
import { demoRoleFromRequest } from "@/lib/http";

export async function GET(req: Request) {
  const role = demoRoleFromRequest(req);
  if (!canAccessConsoleRules(role)) {
    return NextResponse.json({ error: ADMIN_API_FORBIDDEN }, { status: 403 });
  }

  const rules = await prisma.compassAlertRule.findMany({
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json(rules);
}

export async function POST(req: Request) {
  const role = demoRoleFromRequest(req);
  if (!canAccessConsoleRules(role)) {
    return NextResponse.json({ error: ADMIN_API_FORBIDDEN }, { status: 403 });
  }

  const body = (await req.json()) as {
    conditionLabel?: string;
    actionLabel?: string;
    sortOrder?: number;
  };
  const conditionLabel = body.conditionLabel?.trim();
  const actionLabel = body.actionLabel?.trim();
  if (!conditionLabel || !actionLabel) {
    return NextResponse.json(
      { error: "条件与对策文案不能为空" },
      { status: 400 },
    );
  }

  if (conditionLabel.length > 200 || actionLabel.length > 200) {
    return NextResponse.json(
      { error: "条件与对策文案过长（建议 <= 200 字符）" },
      { status: 400 },
    );
  }

  const last = await prisma.compassAlertRule.findFirst({
    orderBy: { sortOrder: "desc" },
  });
  let sortOrder = body.sortOrder ?? (last ? last.sortOrder + 1 : 0);
  if (body.sortOrder !== undefined) {
    const n = Number(body.sortOrder);
    if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
      return NextResponse.json({ error: "sortOrder 须为非负整数" }, { status: 400 });
    }
    sortOrder = n;
  }
  const row = await prisma.compassAlertRule.create({
    data: { conditionLabel, actionLabel, sortOrder },
  });
  return NextResponse.json(row);
}
