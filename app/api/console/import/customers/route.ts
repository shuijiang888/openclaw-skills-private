import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { demoRoleFromRequest } from "@/lib/http";
import { canImportConsoleCsv } from "@/lib/demo-role-modules";
import { parseCustomerCsvImport, type ParsedCustomerRow } from "@/lib/parse-customer-csv";

const VALID_TIERS = new Set(["NORMAL", "KEY", "STRATEGIC"]);

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

  let rows: ParsedCustomerRow[];
  const b = body as { csvText?: unknown; rows?: unknown };

  if (typeof b.csvText === "string") {
    const parsed = parseCustomerCsvImport(b.csvText);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    rows = parsed.rows;
  } else if (Array.isArray(b.rows)) {
    rows = [];
    for (let i = 0; i < b.rows.length; i++) {
      const item = b.rows[i];
      if (!item || typeof item !== "object") continue;
      const o = item as Record<string, unknown>;
      const name = typeof o.name === "string" ? o.name.trim() : "";
      if (!name) continue;
      const tier = String(o.tier ?? "NORMAL").toUpperCase();
      if (!VALID_TIERS.has(tier)) {
        return NextResponse.json(
          {
            error: `rows[${i}]：tier 须为 NORMAL / KEY / STRATEGIC`,
          },
          { status: 400 },
        );
      }
      const ar = Number(o.arDays ?? 30);
      if (!Number.isFinite(ar) || ar < 0 || ar > 3650) {
        return NextResponse.json(
          { error: `rows[${i}]：arDays 须为 0–3650` },
          { status: 400 },
        );
      }
      rows.push({ name, tier, arDays: Math.round(ar) });
    }
    if (rows.length === 0) {
      return NextResponse.json({ error: "rows 数组无有效项" }, { status: 400 });
    }
  } else {
    return NextResponse.json(
      { error: "需提供 csvText 字符串或 rows 数组" },
      { status: 400 },
    );
  }

  let created = 0;
  let skipped = 0;
  for (const row of rows) {
    const exists = await prisma.customer.findFirst({
      where: { name: row.name },
    });
    if (exists) {
      skipped++;
      continue;
    }
    await prisma.customer.create({
      data: {
        name: row.name,
        tier: row.tier,
        arDays: row.arDays,
      },
    });
    created++;
  }

  return NextResponse.json({
    created,
    skipped,
    totalInput: rows.length,
  });
}
