import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
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
  const row = await prisma.compassAlertRule.update({
    where: { id },
    data: {
      ...(conditionLabel !== undefined ? { conditionLabel } : {}),
      ...(actionLabel !== undefined ? { actionLabel } : {}),
      ...(body.sortOrder !== undefined
        ? { sortOrder: Number(body.sortOrder) }
        : {}),
    },
  });
  return NextResponse.json(row);
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  try {
    await prisma.compassAlertRule.delete({ where: { id } });
  } catch {
    return NextResponse.json({ error: "删除失败" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
