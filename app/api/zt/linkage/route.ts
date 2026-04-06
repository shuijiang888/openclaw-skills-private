import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequestUserContext } from "@/lib/request-user";
import { ensureZtBootstrap } from "@/lib/zt-bootstrap";

export const dynamic = "force-dynamic";

type LinkageCityItem = {
  region: string;
  submissions: number;
  approvedProjects: number;
  pendingProjects: number;
  avgSuggestedPrice: number;
  estPotentialRevenue: number;
};

type LinkageIntelItem = {
  intelDefId: string;
  name: string;
  category: string;
  submissions: number;
  linkedTaskCount: number;
  mappedProjectCount: number;
};

type LinkageProjectItem = {
  id: string;
  name: string;
  customerName: string;
  status: string;
  suggestedPrice: number;
  marginSuggest: number;
  linkedSignals: number;
  linkedIntelDefs: string[];
};

function scoreProjectLinkByRegion(projectRegion: string, signalRegion: string): number {
  if (!projectRegion || !signalRegion) return 0;
  if (projectRegion === signalRegion) return 1;
  return projectRegion.includes(signalRegion) || signalRegion.includes(projectRegion)
    ? 0.6
    : 0;
}

export async function GET(req: Request) {
  try {
    await ensureZtBootstrap();
    const ctx = getRequestUserContext(req);
    if (!ctx.isZtManager) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const [submissions, intelDefs, tasks, projects] = await Promise.all([
      prisma.ztSubmission.findMany({
        orderBy: { createdAt: "desc" },
        take: 600,
        select: {
          id: true,
          title: true,
          region: true,
          intelDefId: true,
          taskId: true,
          createdAt: true,
          pointsGranted: true,
        },
      }),
      prisma.ztIntelDefinition.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: { id: true, name: true, category: true },
      }),
      prisma.ztBountyTask.findMany({
        orderBy: { createdAt: "desc" },
        take: 240,
        select: { id: true, intelDefId: true, status: true, title: true },
      }),
      prisma.project.findMany({
        include: { customer: true, quote: true },
        orderBy: { updatedAt: "desc" },
        take: 300,
      }),
    ]);

    const defMap = new Map(intelDefs.map((d) => [d.id, d]));
    const taskByDef = new Map<string, number>();
    for (const t of tasks) {
      if (!t.intelDefId) continue;
      taskByDef.set(t.intelDefId, (taskByDef.get(t.intelDefId) ?? 0) + 1);
    }

    const cityMap = new Map<string, LinkageCityItem>();
    for (const s of submissions) {
      const region = s.region.trim() || "未标注区域";
      const prev = cityMap.get(region) ?? {
        region,
        submissions: 0,
        approvedProjects: 0,
        pendingProjects: 0,
        avgSuggestedPrice: 0,
        estPotentialRevenue: 0,
      };
      prev.submissions += 1;
      cityMap.set(region, prev);
    }

    const projectSignalsMap = new Map<string, { count: number; defs: Set<string> }>();
    for (const p of projects) {
      const customerName = p.customer?.name?.trim() ?? "";
      const inferredRegion = customerName.slice(0, 2);
      const matchedSignals = submissions.filter((s) => {
        const baseScore = scoreProjectLinkByRegion(inferredRegion, s.region.trim());
        return baseScore > 0;
      });
      const defs = new Set<string>();
      for (const s of matchedSignals) {
        if (s.intelDefId) defs.add(s.intelDefId);
      }
      projectSignalsMap.set(p.id, { count: matchedSignals.length, defs });
    }

    for (const p of projects) {
      const customerName = p.customer?.name?.trim() ?? "未知客户";
      const inferredRegion = customerName.slice(0, 2) || "未标注区域";
      const city = cityMap.get(inferredRegion);
      if (!city) continue;
      const suggested = p.quote?.suggestedPrice ?? 0;
      if (p.status === "APPROVED") city.approvedProjects += 1;
      if (p.status === "PENDING_APPROVAL") city.pendingProjects += 1;
      city.estPotentialRevenue += suggested;
    }

    const cityItems = Array.from(cityMap.values())
      .map((x) => {
        const denom = Math.max(1, x.approvedProjects + x.pendingProjects);
        return {
          ...x,
          avgSuggestedPrice: Math.round((x.estPotentialRevenue / denom) * 100) / 100,
          estPotentialRevenue: Math.round(x.estPotentialRevenue * 100) / 100,
        };
      })
      .sort((a, b) => b.submissions - a.submissions || b.estPotentialRevenue - a.estPotentialRevenue)
      .slice(0, 12);

    const intelStats = new Map<string, LinkageIntelItem>();
    for (const s of submissions) {
      if (!s.intelDefId) continue;
      const def = defMap.get(s.intelDefId);
      if (!def) continue;
      const prev = intelStats.get(def.id) ?? {
        intelDefId: def.id,
        name: def.name,
        category: def.category,
        submissions: 0,
        linkedTaskCount: taskByDef.get(def.id) ?? 0,
        mappedProjectCount: 0,
      };
      prev.submissions += 1;
      intelStats.set(def.id, prev);
    }
    for (const p of projects) {
      const signals = projectSignalsMap.get(p.id);
      if (!signals) continue;
      for (const defId of signals.defs) {
        const stat = intelStats.get(defId);
        if (stat) stat.mappedProjectCount += 1;
      }
    }
    const intelItems = Array.from(intelStats.values())
      .sort((a, b) => b.submissions - a.submissions || b.mappedProjectCount - a.mappedProjectCount)
      .slice(0, 12);

    const projectItems: LinkageProjectItem[] = projects
      .map((p) => {
        const signal = projectSignalsMap.get(p.id) ?? { count: 0, defs: new Set<string>() };
        const quote = p.quote;
        const totalCost =
          (quote?.material ?? 0) +
          (quote?.labor ?? 0) +
          (quote?.overhead ?? 0) +
          (quote?.period ?? 0);
        const marginSuggest =
          quote?.suggestedPrice && quote.suggestedPrice > 0
            ? Math.round(((quote.suggestedPrice - totalCost) / quote.suggestedPrice) * 10000) / 100
            : 0;
        return {
          id: p.id,
          name: p.name,
          customerName: p.customer?.name ?? "未知客户",
          status: p.status,
          suggestedPrice: quote?.suggestedPrice ?? 0,
          marginSuggest,
          linkedSignals: signal.count,
          linkedIntelDefs: Array.from(signal.defs),
        };
      })
      .sort((a, b) => b.linkedSignals - a.linkedSignals || b.suggestedPrice - a.suggestedPrice)
      .slice(0, 20);

    const coverage = {
      submissions: submissions.length,
      projects: projects.length,
      tasks: tasks.length,
      intelDefinitions: intelDefs.length,
      submissionToProjectLinkRatePct:
        projects.length > 0
          ? Math.round(
              (projectItems.filter((x) => x.linkedSignals > 0).length / projects.length) * 10000,
            ) / 100
          : 0,
      avgSignalsPerProject:
        projects.length > 0
          ? Math.round(
              (projectItems.reduce((sum, x) => sum + x.linkedSignals, 0) / projects.length) * 100,
            ) / 100
          : 0,
    };

    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      coverage,
      byCity: cityItems,
      byIntelDefinition: intelItems,
      topLinkedProjects: projectItems,
      notes: [
        "联动映射为MVP启发式规则：基于客户名称推断区域与情报区域匹配；不改动既有业务表结构。",
        "后续可升级为显式关联字段（submission -> opportunity -> project）并引入CRM回写。",
      ],
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "zt_linkage_unavailable",
        message:
          error instanceof Error ? error.message : "zt linkage unavailable",
      },
      { status: 503 },
    );
  }
}
