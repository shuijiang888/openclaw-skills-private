import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enrichProject } from "@/lib/serialize";

export async function GET() {
  const rows = await prisma.project.findMany({
    where: { status: "PENDING_APPROVAL" },
    orderBy: { updatedAt: "desc" },
    include: { customer: true, quote: true },
  });
  return NextResponse.json(rows.map(enrichProject));
}
