import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const rules = await prisma.compassAlertRule.findMany({
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json(rules);
}

export async function POST(req: Request) {
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
  const last = await prisma.compassAlertRule.findFirst({
    orderBy: { sortOrder: "desc" },
  });
  const sortOrder =
    body.sortOrder ?? (last ? last.sortOrder + 1 : 0);
  const row = await prisma.compassAlertRule.create({
    data: { conditionLabel, actionLabel, sortOrder },
  });
  return NextResponse.json(row);
}
