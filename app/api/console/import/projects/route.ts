import { NextResponse } from "next/server";
import { buildAiSuggestion, suggestedPriceFromCosts, totalCost } from "@/lib/calc";
import { defaultBenchmarkPrices } from "@/lib/benchmarks";
import { canImportConsoleCsv } from "@/lib/demo-role-modules";
import { demoRoleFromRequest } from "@/lib/http";
import { parseProjectCsvImport } from "@/lib/parse-project-csv";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const role = demoRoleFromRequest(req);
  if (!canImportConsoleCsv(role)) {
    return NextResponse.json(
      { error: "需要管理员演示身份，并在请求头携带 x-demo-role: ADMIN" },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "无效 JSON" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "请求体无效" }, { status: 400 });
  }

  const csvText = (body as { csvText?: unknown }).csvText;
  if (typeof csvText !== "string") {
    return NextResponse.json({ error: "需提供 csvText 字符串" }, { status: 400 });
  }

  const parsed = parseProjectCsvImport(csvText);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let i = 0; i < parsed.rows.length; i++) {
    const row = parsed.rows[i];
    const customer = await prisma.customer.findFirst({
      where: { name: row.customerName },
    });
    if (!customer) {
      errors.push(`第 ${i + 2} 行：未找到客户「${row.customerName}」`);
      continue;
    }

    const dup = await prisma.project.findFirst({
      where: {
        customerId: customer.id,
        name: row.projectName,
      },
    });
    if (dup) {
      skipped++;
      continue;
    }

    const merged = {
      material: row.material,
      labor: row.labor,
      overhead: row.overhead,
      period: row.period,
      coeffCustomer: row.coeffCustomer,
      coeffIndustry: row.coeffIndustry,
      coeffRegion: row.coeffRegion,
      coeffProduct: row.coeffProduct,
      coeffLead: row.coeffLead,
      coeffQty: row.coeffQty,
    };
    const suggestedPrice = suggestedPriceFromCosts(merged);
    const cost = totalCost(merged);
    const ai = buildAiSuggestion({
      suggestedPrice,
      cost,
      customerTier: customer.tier,
    });
    const benchmarksJson = JSON.stringify(defaultBenchmarkPrices(suggestedPrice));

    try {
      await prisma.$transaction(async (tx) => {
        const project = await tx.project.create({
          data: {
            name: row.projectName,
            productName: row.productName,
            customerId: customer.id,
            quantity: row.quantity,
            leadDays: row.leadDays,
            isStandard: row.isStandard,
            isSmallOrder: row.isSmallOrder,
            status: row.status,
          },
        });
        await tx.quote.create({
          data: {
            projectId: project.id,
            material: row.material,
            labor: row.labor,
            overhead: row.overhead,
            period: row.period,
            coeffCustomer: row.coeffCustomer,
            coeffIndustry: row.coeffIndustry,
            coeffRegion: row.coeffRegion,
            coeffProduct: row.coeffProduct,
            coeffLead: row.coeffLead,
            coeffQty: row.coeffQty,
            suggestedPrice,
            counterPrice: row.counterPrice,
            approvedPrice: row.approvedPrice,
            pendingRole: row.pendingRole,
            wsPrice: row.wsPrice,
            wsRelation: row.wsRelation,
            wsDelivery: row.wsDelivery,
            wsTech: row.wsTech,
            wsPayment: row.wsPayment,
            aiSuggestion: ai,
            benchmarksJson,
          },
        });
      });
      created++;
    } catch (e) {
      errors.push(
        `第 ${i + 2} 行「${row.projectName}」写入失败：${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  return NextResponse.json({
    created,
    skipped,
    failed: errors.length,
    errors: errors.slice(0, 20),
    totalInput: parsed.rows.length,
  });
}
