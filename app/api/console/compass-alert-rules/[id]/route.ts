import { NextResponse } from "next/server";
import { ADMIN_API_FORBIDDEN } from "@/lib/api-messages";
import { prisma } from "@/lib/prisma";
import { canAccessConsoleRules } from "@/lib/demo-role-modules";
import { demoRoleFromRequest } from "@/lib/http";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const role = demoRoleFromRequest(req);
  if (!canAccessConsoleRules(role)) {
    return NextResponse.json({ error: ADMIN_API_FORBIDDEN }, { status: 403 });
  }

  const { id } = await params;
  const body = (await req.json()) as {
    conditionLabel?: string;
    actionLabel?: string;
    sortOrder?: number;
  };
  const exists = await prisma.compassAlertRule.findUnique({ where: { id } });
  if (!exists) {
    return NextResponse.json({ error: "记录不存在" }, { status: 404 });
  }
  const conditionLabel =
    body.conditionLabel !== undefined
      ? body.conditionLabel.trim()
      : undefined;
  const actionLabel =
    body.actionLabel !== undefined ? body.actionLabel.trim() : undefined;
  if (
    (conditionLabel !== undefined && !conditionLabel) ||
    (actionLabel !== undefined && !actionLabel)
  ) {
    return NextResponse.json({ error: "条件与对策不可为空" }, { status: 400 });
  }

  if (
    (conditionLabel !== undefined && conditionLabel.length > 200) ||
    (actionLabel !== undefined && actionLabel.length > 200)
  ) {
    return NextResponse.json(
      { error: "条件与对策文案过长（建议 <= 200 字符）" },
      { status: 400 },
    );
  }

  let sortOrder: number | undefined = undefined;
  if (body.sortOrder !== undefined) {
    const n = Number(body.sortOrder);
    if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
      return NextResponse.json({ error: "sortOrder 须为非负整数" }, { status: 400 });
    }
    sortOrder = n;
  }

  const row = await prisma.compassAlertRule.update({
    where: { id },
    data: {
      ...(conditionLabel !== undefined ? { conditionLabel } : {}),
      ...(actionLabel !== undefined ? { actionLabel } : {}),
      ...(sortOrder !== undefined
        ? { sortOrder }
        : {}),
    },
  });
  return NextResponse.json(row);
}

export async function DELETE(req: Request, { params }: Params) {
  const role = demoRoleFromRequest(req);
  if (!canAccessConsoleRules(role)) {
    return NextResponse.json({ error: ADMIN_API_FORBIDDEN }, { status: 403 });
  }

  const { id } = await params;
  try {
    await prisma.compassAlertRule.delete({ where: { id } });
  } catch {
    return NextResponse.json({ error: "删除失败" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
