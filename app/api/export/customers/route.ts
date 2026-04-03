import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { csvLine, withUtf8Bom } from "@/lib/csv-format";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HEADER = [
  "customerId",
  "name",
  "tier",
  "arDays",
  "projectCount",
  "createdAtIso",
] as const;

export async function GET() {
  const rows = await prisma.customer.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { projects: true } } },
  });

  let csv = csvLine([...HEADER]);
  for (const c of rows) {
    csv += csvLine([
      c.id,
      c.name,
      c.tier,
      c.arDays,
      c._count.projects,
      c.createdAt.toISOString(),
    ]);
  }

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(withUtf8Bom(csv), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="profit-customers-${stamp}.csv"`,
    },
  });
}
