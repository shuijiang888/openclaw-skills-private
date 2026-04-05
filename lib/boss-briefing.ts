import type { Customer, Project, Quote } from "@prisma/client";
import { enrichProject } from "@/lib/serialize";
import { computePortfolioMetrics } from "@/lib/metrics";
import { prisma } from "@/lib/prisma";

type BossBriefingProjectRow = Project & {
  customer: Pick<Customer, "id" | "name" | "tier">;
  quote: Quote | null;
};

export type BossBriefingDTO = {
  version: 1;
  generatedAt: string;
  disclaimer: string;
  metrics: {
    lowMarginQuoteCount: number;
    autoChannelEligibleCount: number;
    autoChannelEligiblePct: number;
    collabChannelCount: number;
    pendingApprovalCount: number;
    approvedCount: number;
    projectCount: number;
    avgWinRate: number;
    topCustomerConcentrationPct: number;
    strategicCustomerProjectCount: number;
  };
  narrative: {
    headline: string;
    bullets: string[];
    decisions: string[];
  };
};

function concentrationTopCustomerPct(
  rows: Pick<Project, "customerId">[],
): number {
  if (rows.length === 0) return 0;
  const byCustomer = new Map<string, number>();
  for (const r of rows) {
    byCustomer.set(r.customerId, (byCustomer.get(r.customerId) ?? 0) + 1);
  }
  let max = 0;
  for (const n of byCustomer.values()) max = Math.max(max, n);
  return Math.round((max / rows.length) * 1000) / 10;
}

export function buildBossBriefingFromProjects(
  rows: BossBriefingProjectRow[],
): BossBriefingDTO {
  const vm = computePortfolioMetrics(rows);
  const autoPct =
    vm.projectCount > 0
      ? Math.round((vm.autoChannelEligibleCount / vm.projectCount) * 1000) / 10
      : 0;

  let collabChannelCount = 0;
  let winSum = 0;
  let winN = 0;
  let strategicCustomerProjectCount = 0;

  for (const raw of rows) {
    if (raw.customer.tier === "STRATEGIC") strategicCustomerProjectCount += 1;
    const p = enrichProject(raw);
    if (!p.quote || !("computed" in p.quote)) continue;
    const q = p.quote;
    if (q.computed.shunt.channel === "COLLAB") collabChannelCount += 1;
    winSum += q.computed.winRate;
    winN += 1;
  }

  const avgWinRate = winN > 0 ? Math.round((winSum / winN) * 10) / 10 : 0;
  const topCustomerConcentrationPct = concentrationTopCustomerPct(rows);

  const bullets = [
    `建议价口径毛利率低于 15% 的报价共 ${vm.lowMarginQuoteCount} 单，构成当前主要利润风险池（试点阈值与经营看板一致）。`,
    `约 ${autoPct}% 的项目测算走自动通道，${collabChannelCount} 单需人机协同复核，可作为流程标准化与例外管理的讨论抓手。`,
    `待审批 ${vm.pendingApprovalCount} 单、已核准 ${vm.approvedCount} 单；平均胜率约 ${avgWinRate}%（规则合成，来源为工作台 WinScore）。`,
    `TOP1 客户项目占比约 ${topCustomerConcentrationPct}%${
      strategicCustomerProjectCount > 0
        ? `；其中战略客户相关项目 ${strategicCustomerProjectCount} 个`
        : ""
    }，可对照盈利罗盘看集中度与象限迁移。`,
  ];

  const nLow = Math.min(3, vm.lowMarginQuoteCount);
  const decisions = [
    `是否在周例会前清空待审批队列（当前 ${vm.pendingApprovalCount} 单），并明确 SLA 责任人（试点叙事）。`,
    topCustomerConcentrationPct >= 35
      ? `TOP 客户项目占比 ${topCustomerConcentrationPct}% 偏高，是否对新增折扣增设「总经理」加签（试点讨论项）。`
      : `是否将自动通道覆盖率从 ${autoPct}% 作为下季度运营目标，并配套培训与模板（试点讨论项）。`,
    nLow > 0
      ? `是否将低毛利清单中 ${nLow} 项纳入工艺/采购降本专题，两周内回报进展（试点讨论项）。`
      : `是否启动一轮标杆客户回访，验证胜率与价格弹性假设（试点讨论项）。`,
  ];

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    disclaimer:
      "本简报为产品试点版组合指标与叙事模板，数字来自当前库内数据与测算逻辑，非生产法定报表。",
    metrics: {
      lowMarginQuoteCount: vm.lowMarginQuoteCount,
      autoChannelEligibleCount: vm.autoChannelEligibleCount,
      autoChannelEligiblePct: autoPct,
      collabChannelCount,
      pendingApprovalCount: vm.pendingApprovalCount,
      approvedCount: vm.approvedCount,
      projectCount: vm.projectCount,
      avgWinRate,
      topCustomerConcentrationPct,
      strategicCustomerProjectCount,
    },
    narrative: {
      headline: "老板简报 · 组合视图（试点）",
      bullets,
      decisions,
    },
  };
}

export async function getBossBriefing(): Promise<BossBriefingDTO> {
  const projects = await prisma.project.findMany({
    include: { quote: true },
  });
  const customerIds = Array.from(new Set(projects.map((p) => p.customerId)));
  const customers =
    customerIds.length > 0
      ? await prisma.customer.findMany({
          where: { id: { in: customerIds } },
          select: { id: true, name: true, tier: true },
        })
      : [];
  const customerMap = new Map(customers.map((c) => [c.id, c]));
  const rows: BossBriefingProjectRow[] = projects.map((p) => ({
    ...p,
    customer: customerMap.get(p.customerId) ?? {
      id: p.customerId,
      name: "未知客户",
      tier: "NORMAL",
    },
  }));
  return buildBossBriefingFromProjects(rows);
}
