import { PageContainer } from "@/components/PageContainer";
import { prisma } from "@/lib/prisma";
import { enrichProject } from "@/lib/serialize";
import { computePortfolioMetrics } from "@/lib/metrics";
import { AnimatedNumber } from "@/components/charts/AnimatedNumber";
import { DonutChart } from "@/components/charts/DonutChart";
import { SalesFunnelChart } from "@/components/charts/SalesFunnelChart";

export const dynamic = "force-dynamic";

export default async function DataScreenPage() {
  const allProjects = await prisma.project.findMany({
    include: { customer: true, quote: true },
  });
  const vm = computePortfolioMetrics(allProjects);
  const compassCount = await prisma.compassItem.count();

  const draft = allProjects.filter(p => p.status === "DRAFT").length;
  const priced = allProjects.filter(p => p.status === "PRICED").length;
  const pending = allProjects.filter(p => p.status === "PENDING_APPROVAL").length;
  const approved = allProjects.filter(p => p.status === "APPROVED").length;

  const enriched = allProjects.map(enrichProject);
  const totalQuoted = enriched.reduce((s, p) => s + (p.quote && "suggestedPrice" in p.quote ? p.quote.suggestedPrice : 0), 0);
  const avgMargin = enriched.filter(p => p.quote && "computed" in p.quote).length > 0
    ? enriched.reduce((s, p) => s + (p.quote && "computed" in p.quote ? p.quote.computed.grossMarginAtSuggest : 0), 0) / enriched.filter(p => p.quote && "computed" in p.quote).length
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-6 text-white sm:px-8 sm:py-10">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* 标题 */}
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-400/80">Real-time Dashboard</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">经营数据大屏</h1>
          <p className="mt-2 text-sm text-slate-400">智能盈利管理系统 · 实时数据概览</p>
        </div>

        {/* 核心指标 */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { label: "项目总数", value: allProjects.length, suffix: "", color: "from-blue-500 to-blue-600" },
            { label: "报价总额", value: Math.round(totalQuoted / 10000), suffix: " 万", color: "from-amber-500 to-amber-600" },
            { label: "平均毛利率", value: avgMargin, suffix: "%", decimals: 1, color: "from-emerald-500 to-emerald-600" },
            { label: "待审批", value: pending, suffix: "", color: "from-orange-500 to-orange-600" },
            { label: "罗盘项目", value: compassCount, suffix: "", color: "from-violet-500 to-violet-600" },
          ].map(m => (
            <div key={m.label} className={`rounded-2xl bg-gradient-to-br ${m.color} p-5 shadow-lg`}>
              <p className="text-xs font-semibold text-white/80">{m.label}</p>
              <p className="mt-2 text-3xl font-black tabular-nums">
                <AnimatedNumber value={m.value} decimals={m.decimals ?? 0} suffix={m.suffix} className="text-white" />
              </p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* 销售漏斗 */}
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <h2 className="text-sm font-bold">销售漏斗</h2>
            <div className="mt-4">
              <SalesFunnelChart stages={[
                { label: "询价/草稿", count: draft, color: "#94a3b8" },
                { label: "已测算", count: priced, color: "#3b82f6" },
                { label: "待审批", count: pending, color: "#f59e0b" },
                { label: "已成交", count: approved, color: "#10b981" },
              ]} />
            </div>
          </section>

          {/* 项目分布 */}
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <h2 className="text-sm font-bold">项目状态分布</h2>
            <div className="mt-4">
              <DonutChart
                segments={[
                  { label: "草稿", value: draft, color: "#94a3b8" },
                  { label: "已测算", value: priced, color: "#3b82f6" },
                  { label: "待审批", value: pending, color: "#f59e0b" },
                  { label: "已成交", value: approved, color: "#10b981" },
                ]}
                size={200}
                centerValue={String(allProjects.length)}
                centerLabel="总项目"
              />
            </div>
          </section>
        </div>

        {/* 风险指标 */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5">
            <p className="text-xs font-semibold text-red-300">低毛利风险池</p>
            <p className="mt-2 text-4xl font-black tabular-nums text-red-400">
              <AnimatedNumber value={vm.lowMarginQuoteCount} className="text-red-400" />
            </p>
            <p className="mt-1 text-xs text-red-300/70">毛利率低于 15% 的报价</p>
          </div>
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
            <p className="text-xs font-semibold text-emerald-300">自动通道潜力</p>
            <p className="mt-2 text-4xl font-black tabular-nums text-emerald-400">
              <AnimatedNumber value={vm.autoChannelEligibleCount} className="text-emerald-400" />
            </p>
            <p className="mt-1 text-xs text-emerald-300/70">满足自动报价通道</p>
          </div>
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
            <p className="text-xs font-semibold text-amber-300">成交闭环</p>
            <p className="mt-2 text-4xl font-black tabular-nums text-amber-400">
              <AnimatedNumber value={vm.approvedCount} className="text-amber-400" />
            </p>
            <p className="mt-1 text-xs text-amber-300/70">已核准项目</p>
          </div>
        </div>

        <p className="text-center text-xs text-slate-500">
          数据大屏 · 适合会议室投影 · 实时刷新
        </p>
      </div>
    </div>
  );
}
