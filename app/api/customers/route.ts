import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const rows = await prisma.customer.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    name?: string;
    tier?: string;
    arDays?: number;
  };
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "name 必填" }, { status: 400 });
  }
  const row = await prisma.customer.create({
    data: {
      name: body.name.trim(),
      tier: body.tier?.trim() || "NORMAL",
      arDays: body.arDays != null ? Number(body.arDays) : 30,
    },
  });
  return NextResponse.json(row);
}
