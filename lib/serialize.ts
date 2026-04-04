import type { Customer, Project, Quote } from "@prisma/client";
import { defaultBenchmarkPrices } from "@/lib/benchmarks";
import {
  discountPercent,
  grossMarginPercent,
  totalCost,
  winRatePercent,
} from "@/lib/calc";
import { requiredRoleForDiscount } from "@/lib/approval";
import { evaluateShunt } from "@/lib/shunt";
import {
  dueDateLabel,
  flowStageLabel,
  nextStepOverdueDays,
  stageFromProjectStatus,
} from "@/lib/sales-flow";

export type EnrichedQuote = Quote & {
  benchmarks: ReturnType<typeof defaultBenchmarkPrices>;
  computed: {
    totalCost: number;
    discountRatio: number;
    discountPercentDisplay: number;
    grossMarginAtOffer: number;
    grossMarginAtSuggest: number;
    coefficientProduct: number;
    winRate: number;
    requiredApproval: { role: string; label: string };
    shunt: ReturnType<typeof evaluateShunt>;
  };
};

export function enrichQuote(
  q: Quote,
  project: Pick<
    Project,
    "isStandard" | "isSmallOrder" | "quantity" | "leadDays"
  >,
  customer: Pick<Customer, "tier">,
): EnrichedQuote {
  const cost = totalCost(q);
  const k =
    q.coeffCustomer *
    q.coeffIndustry *
    q.coeffRegion *
    q.coeffProduct *
    q.coeffLead *
    q.coeffQty;
  const d = discountPercent(q.suggestedPrice, q.counterPrice);
  const offer = q.counterPrice ?? q.suggestedPrice;
  const marginOffer = grossMarginPercent(offer, cost);
  const marginSuggest = grossMarginPercent(q.suggestedPrice, cost);
  const shunt = evaluateShunt({
    isStandard: project.isStandard,
    isSmallOrder: project.isSmallOrder,
    customerTier: customer.tier,
    discountRatio: d,
    grossMarginPercent: marginSuggest,
  });
  let benchmarks: ReturnType<typeof defaultBenchmarkPrices>;
  try {
    const parsed = JSON.parse(q.benchmarksJson) as unknown;
    if (
      Array.isArray(parsed) &&
      parsed.length > 0 &&
      typeof parsed[0] === "object" &&
      parsed[0] !== null &&
      "diffPct" in (parsed[0] as object)
    ) {
      benchmarks = parsed as ReturnType<typeof defaultBenchmarkPrices>;
    } else {
      benchmarks = defaultBenchmarkPrices(q.suggestedPrice);
    }
  } catch {
    benchmarks = defaultBenchmarkPrices(q.suggestedPrice);
  }

  return {
    ...q,
    benchmarks,
    computed: {
      totalCost: cost,
      discountRatio: d,
      discountPercentDisplay: Math.round(d * 1000) / 10,
      grossMarginAtOffer: marginOffer,
      grossMarginAtSuggest: marginSuggest,
      coefficientProduct: Math.round(k * 10000) / 10000,
      winRate: winRatePercent(q),
      requiredApproval: requiredRoleForDiscount(d),
      shunt,
    },
  };
}

export function enrichProject(
  project: Project & { customer: Customer; quote: Quote | null },
) {
  const normalizedStage = project.flowStage || stageFromProjectStatus(project.status);
  const overdueDays = nextStepOverdueDays(project.nextStepDueAt);
  const flow = {
    stage: normalizedStage,
    stageLabel: flowStageLabel(normalizedStage),
    nextStep: project.nextStep,
    dueAtLabel: dueDateLabel(project.nextStepDueAt),
    overdueDays,
    isOverdue: overdueDays > 0,
    battleCard: project.battleCard,
  };
  if (!project.quote) {
    return { ...project, quote: null, flow };
  }
  return {
    ...project,
    quote: enrichQuote(project.quote, project, project.customer),
    flow,
  };
}
