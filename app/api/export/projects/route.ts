import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { csvLine, withUtf8Bom } from "@/lib/csv-format";
import { enrichProject } from "@/lib/serialize";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HEADER = [
  "projectId",
  "projectName",
  "productName",
  "customerName",
  "customerTier",
  "status",
  "quantity",
  "leadDays",
  "isStandard",
  "isSmallOrder",
  "suggestedPrice",
  "approvedPrice",
  "counterPrice",
  "pendingRole",
  "grossMarginSuggestPct",
  "grossMarginOfferPct",
  "discountPercent",
  "updatedAtIso",
] as const;

export async function GET() {
  const raw = await prisma.project.findMany({
    orderBy: { updatedAt: "desc" },
    include: { customer: true, quote: true },
  });
  const projects = raw.map(enrichProject);

  let csv = csvLine([...HEADER]);
  for (const p of projects) {
    const q = p.quote;
    csv += csvLine([
      p.id,
      p.name,
      p.productName,
      p.customer.name,
      p.customer.tier,
      p.status,
      p.quantity,
      p.leadDays,
      p.isStandard ? 1 : 0,
      p.isSmallOrder ? 1 : 0,
      q?.suggestedPrice ?? "",
      q?.approvedPrice ?? "",
      q?.counterPrice ?? "",
      q?.pendingRole ?? "",
      q && "computed" in q ? q.computed.grossMarginAtSuggest : "",
      q && "computed" in q ? q.computed.grossMarginAtOffer : "",
      q && "computed" in q ? q.computed.discountPercentDisplay : "",
      p.updatedAt.toISOString(),
    ]);
  }

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(withUtf8Bom(csv), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="profit-projects-${stamp}.csv"`,
    },
  });
}
