import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  buildAiSuggestion,
  suggestedPriceFromCosts,
  totalCost,
} from "@/lib/calc";
import { appendTimeline } from "@/lib/timeline";
import { defaultBenchmarkPrices } from "@/lib/benchmarks";
import { enrichProject } from "@/lib/serialize";
import { resolveDataScope, scopeToWhereClause, type RbacRole } from "@/lib/rbac";
import { demoRoleFromRequest, sessionUserIdFromRequest } from "@/lib/http";

export async function GET(req: Request) {
  const role = (demoRoleFromRequest(req) ?? "SALES_DIRECTOR") as RbacRole;
  const userId = sessionUserIdFromRequest(req);

  let where: Record<string, unknown> = {};
  if (userId && role !== "ADMIN" && role !== "SUPER_ADMIN" && role !== "GM" && role !== "SALES_VP") {
    const scope = await resolveDataScope(userId, role);
    where = scopeToWhereClause(scope);
  }

  const rows = await prisma.project.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: { customer: true, quote: true },
  });
  return NextResponse.json(rows.map(enrichProject));
}

export async function POST(req: Request) {
  const body = (await req.json()) as Record<string, unknown>;
  const customerId = String(body.customerId ?? "");
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
  });
  if (!customer) {
    return NextResponse.json({ error: "客户不存在" }, { status: 404 });
  }

  const coeffs = {
    material: Number(body.material ?? 0),
    labor: Number(body.labor ?? 0),
    overhead: Number(body.overhead ?? 0),
    period: Number(body.period ?? 0),
    coeffCustomer: Number(body.coeffCustomer ?? 1.15),
    coeffIndustry: Number(body.coeffIndustry ?? 1.1),
    coeffRegion: Number(body.coeffRegion ?? 0.95),
    coeffProduct: Number(body.coeffProduct ?? 1.2),
    coeffLead: Number(body.coeffLead ?? 1.08),
    coeffQty: Number(body.coeffQty ?? 0.92),
  };

  const suggestedPrice = suggestedPriceFromCosts(coeffs);
  const cost = totalCost(coeffs);
  const ai = buildAiSuggestion({
    suggestedPrice,
    cost,
    customerTier: customer.tier,
  });
  const timelineJson = appendTimeline(undefined, {
    kind: "calc",
    title: "成本与系数计算完成",
    detail: `建议价 ${suggestedPrice}`,
  });

  const creatorId = sessionUserIdFromRequest(req) ?? "legacy_owner";

  const project = await prisma.project.create({
    data: {
      customerId: customer.id,
      name: String(body.name ?? "未命名项目"),
      productName: String(body.productName ?? ""),
      quantity: Number(body.quantity ?? 1),
      leadDays: Number(body.leadDays ?? 15),
      isStandard: Boolean(body.isStandard ?? true),
      isSmallOrder: Boolean(body.isSmallOrder ?? true),
      status: "PRICED",
      ownerId: creatorId,
      quote: {
        create: {
          ...coeffs,
          suggestedPrice,
          benchmarksJson: JSON.stringify(defaultBenchmarkPrices(suggestedPrice)),
          aiSuggestion: ai,
          timelineJson,
          wsPrice: Number(body.wsPrice ?? 85),
          wsRelation: Number(body.wsRelation ?? 90),
          wsDelivery: Number(body.wsDelivery ?? 88),
          wsTech: Number(body.wsTech ?? 92),
          wsPayment: Number(body.wsPayment ?? 75),
        },
      },
    },
    include: { customer: true, quote: true },
  });

  return NextResponse.json(enrichProject(project));
}
