import { NextResponse } from "next/server";
import {
  newRequestId,
  withRequestIdHeader,
  writeAgentAuditSafe,
} from "@/lib/agent-audit";
import { prisma } from "@/lib/prisma";
import {
  buildAiSuggestion,
  suggestedPriceFromCosts,
  totalCost,
} from "@/lib/calc";
import { defaultBenchmarkPrices } from "@/lib/benchmarks";
import { enrichProject } from "@/lib/serialize";
import { appendTimeline } from "@/lib/timeline";

type Params = { params: Promise<{ id: string }> };

const AUDIT_SCALAR_KEYS = [
  "material",
  "labor",
  "overhead",
  "period",
  "coeffCustomer",
  "coeffIndustry",
  "coeffRegion",
  "coeffProduct",
  "coeffLead",
  "coeffQty",
  "wsPrice",
  "wsRelation",
  "wsDelivery",
  "wsTech",
  "wsPayment",
] as const;

export async function PATCH(req: Request, { params }: Params) {
  const requestId = newRequestId();
  const rh = withRequestIdHeader(requestId);
  const { id } = await params;
  const route = `PATCH /api/quotes/${id}`;
  const existing = await prisma.quote.findUnique({
    where: { id },
    include: { project: { include: { customer: true } } },
  });
  if (!existing) {
    return NextResponse.json({ error: "报价不存在" }, { status: 404, headers: rh });
  }

  const body = (await req.json()) as Record<string, unknown>;
  const merged = {
    material:
      body.material !== undefined
        ? Number(body.material)
        : existing.material,
    labor:
      body.labor !== undefined ? Number(body.labor) : existing.labor,
    overhead:
      body.overhead !== undefined
        ? Number(body.overhead)
        : existing.overhead,
    period:
      body.period !== undefined ? Number(body.period) : existing.period,
    coeffCustomer:
      body.coeffCustomer !== undefined
        ? Number(body.coeffCustomer)
        : existing.coeffCustomer,
    coeffIndustry:
      body.coeffIndustry !== undefined
        ? Number(body.coeffIndustry)
        : existing.coeffIndustry,
    coeffRegion:
      body.coeffRegion !== undefined
        ? Number(body.coeffRegion)
        : existing.coeffRegion,
    coeffProduct:
      body.coeffProduct !== undefined
        ? Number(body.coeffProduct)
        : existing.coeffProduct,
    coeffLead:
      body.coeffLead !== undefined
        ? Number(body.coeffLead)
        : existing.coeffLead,
    coeffQty:
      body.coeffQty !== undefined
        ? Number(body.coeffQty)
        : existing.coeffQty,
    counterPrice:
      body.counterPrice === null
        ? null
        : body.counterPrice !== undefined
          ? Number(body.counterPrice)
          : existing.counterPrice,
    wsPrice:
      body.wsPrice !== undefined ? Number(body.wsPrice) : existing.wsPrice,
    wsRelation:
      body.wsRelation !== undefined
        ? Number(body.wsRelation)
        : existing.wsRelation,
    wsDelivery:
      body.wsDelivery !== undefined
        ? Number(body.wsDelivery)
        : existing.wsDelivery,
    wsTech:
      body.wsTech !== undefined ? Number(body.wsTech) : existing.wsTech,
    wsPayment:
      body.wsPayment !== undefined
        ? Number(body.wsPayment)
        : existing.wsPayment,
  };

  const suggestedPrice = suggestedPriceFromCosts(merged);
  const cost = totalCost(merged);
  const ai = buildAiSuggestion({
    suggestedPrice,
    cost,
    customerTier: existing.project.customer.tier,
  });
  const refreshBench = Boolean(body.refreshBenchmarks);

  let timelineJson = existing.timelineJson;
  let timelineAppended = false;
  if (
    body.timelineNote &&
    typeof body.timelineNote === "object" &&
    body.timelineNote !== null
  ) {
    const tn = body.timelineNote as Record<string, unknown>;
    const title = tn.title != null ? String(tn.title).trim() : "";
    if (title) {
      const nextTl = appendTimeline(existing.timelineJson, {
        kind: String(tn.kind ?? "note"),
        title,
        detail:
          tn.detail != null && String(tn.detail).trim()
            ? String(tn.detail)
            : undefined,
      });
      if (nextTl !== existing.timelineJson) {
        timelineJson = nextTl;
        timelineAppended = true;
      }
    }
  }

  const deltas: Record<string, { from: unknown; to: unknown }> = {};
  for (const key of AUDIT_SCALAR_KEYS) {
    const from = existing[key];
    const to = merged[key];
    if (from !== to) deltas[key] = { from, to };
  }
  if (existing.suggestedPrice !== suggestedPrice) {
    deltas.suggestedPrice = {
      from: existing.suggestedPrice,
      to: suggestedPrice,
    };
  }
  const fromCp = existing.counterPrice ?? null;
  const toCp = merged.counterPrice ?? null;
  if (fromCp !== toCp) {
    deltas.counterPrice = { from: fromCp, to: toCp };
  }

  const patchKeys = Object.keys(body).filter((k) => body[k] !== undefined);
  const benchmarksRefreshed = refreshBench;
  const auditWorthy =
    Object.keys(deltas).length > 0 ||
    timelineAppended ||
    benchmarksRefreshed;

  if (auditWorthy) {
    await writeAgentAuditSafe({
      requestId,
      route,
      action: "quote_patch",
      req,
      meta: {
        quoteId: id,
        projectId: existing.projectId,
        patchKeys,
        deltas,
        timelineAppended,
        benchmarksRefreshed,
      },
    });
  }

  await prisma.quote.update({
    where: { id },
    data: {
      material: merged.material,
      labor: merged.labor,
      overhead: merged.overhead,
      period: merged.period,
      coeffCustomer: merged.coeffCustomer,
      coeffIndustry: merged.coeffIndustry,
      coeffRegion: merged.coeffRegion,
      coeffProduct: merged.coeffProduct,
      coeffLead: merged.coeffLead,
      coeffQty: merged.coeffQty,
      suggestedPrice,
      counterPrice: merged.counterPrice,
      wsPrice: merged.wsPrice,
      wsRelation: merged.wsRelation,
      wsDelivery: merged.wsDelivery,
      wsTech: merged.wsTech,
      wsPayment: merged.wsPayment,
      aiSuggestion: ai,
      benchmarksJson: refreshBench
        ? JSON.stringify(defaultBenchmarkPrices(suggestedPrice))
        : undefined,
      timelineJson,
    },
  });

  const project = await prisma.project.findUnique({
    where: { id: existing.projectId },
    include: { customer: true, quote: true },
  });
  if (!project?.quote) {
    return NextResponse.json({ error: "数据不一致" }, { status: 500, headers: rh });
  }
  return NextResponse.json(enrichProject(project), { headers: rh });
}
