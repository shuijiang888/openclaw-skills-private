import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const [
    customers,
    projects,
    pendingApproval,
    approved,
    priced,
    draft,
    compass,
    avgSuggest,
  ] = await Promise.all([
    prisma.customer.count(),
    prisma.project.count(),
    prisma.project.count({ where: { status: "PENDING_APPROVAL" } }),
    prisma.project.count({ where: { status: "APPROVED" } }),
    prisma.project.count({ where: { status: "PRICED" } }),
    prisma.project.count({ where: { status: "DRAFT" } }),
    prisma.compassItem.count(),
    prisma.quote.aggregate({ _avg: { suggestedPrice: true } }),
  ]);

  return NextResponse.json({
    customers,
    projects,
    byStatus: { pendingApproval, approved, priced, draft },
    compass,
    avgSuggestedPrice: avgSuggest._avg.suggestedPrice ?? 0,
  });
}
