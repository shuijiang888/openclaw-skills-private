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
import {
  emptyStageEvidence,
  battleCardTemplateById,
  normalizeFlowStage,
  parseBattleCardId,
  stageFromProjectStatus,
  statusFromFlowStage,
} from "@/lib/sales-flow";

export async function GET() {
  const rows = await prisma.project.findMany({
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
  const stage = normalizeFlowStage(
    body.flowStage,
    stageFromProjectStatus("PRICED"),
  );
  const battleCard = parseBattleCardId(body.battleCard);
  const template = battleCardTemplateById(battleCard);
  const nextStep =
    typeof body.nextStep === "string" && body.nextStep.trim()
      ? body.nextStep.trim()
      : template?.defaultNextStep ?? "";
  const dueInput = body.nextStepDueAt;
  const nextStepDueAt =
    typeof dueInput === "string" && dueInput.trim()
      ? new Date(dueInput)
      : template
        ? new Date(Date.now() + template.dueInDays * 24 * 60 * 60 * 1000)
        : null;
  const validNextStepDueAt =
    nextStepDueAt && !Number.isNaN(nextStepDueAt.getTime()) ? nextStepDueAt : null;
  const status = statusFromFlowStage(stage);

  const project = await prisma.project.create({
    data: {
      customerId: customer.id,
      name: String(body.name ?? "未命名项目"),
      productName: String(body.productName ?? ""),
      quantity: Number(body.quantity ?? 1),
      leadDays: Number(body.leadDays ?? 15),
      isStandard: Boolean(body.isStandard ?? true),
      isSmallOrder: Boolean(body.isSmallOrder ?? true),
      status,
      flowStage: stage,
      nextStep,
      nextStepDueAt: validNextStepDueAt,
      battleCard,
      stageEvidenceJson: JSON.stringify(emptyStageEvidence()),
      closeLostReason: "",
      lastStageAt: new Date(),
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
