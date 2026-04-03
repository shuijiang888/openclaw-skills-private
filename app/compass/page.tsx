import Link from "next/link";
import { PageContainer } from "@/components/PageContainer";
import {
  COMPASS_QUADRANT_DEFAULTS,
  computeCompassQuadrant,
  type CompassQuadrantThresholds,
} from "@/lib/compass-quadrant";
import { tryGetCompassQuadrantThresholdRow } from "@/lib/load-compass-quadrant-threshold";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const Q_META: Record<string, { title: string; subtitle: string; color: string; bgClass: string; strategy: string; action: string }> = {
  STAR: {
    title: "明星项目",
    subtitle: "高毛利 · 高增长",
    color: "text-emerald-800 dark:text-emerald-300",
    bgClass: "bg-emerald-500/10 border-emerald-200 dark:border-emerald-800 dark:bg-emerald-500/15",
    strategy: "加大投入\n重点保护",
    action: "优先保供、扩大产能、确保交付",
  },
  CASH_COW: {
    title: "现金牛",
    subtitle: "高毛利 · 低增长",
    color: "text-sky-800 dark:text-sky-300",
    bgClass: "bg-sky-500/10 border-sky-200 dark:border-sky-800 dark:bg-sky-500/15",
    strategy: "维持现状\n稳定收益",
    action: "控制成本、维持客户关系、稳定利润",
  },
  QUESTION: {
    title: "问题项目",
    subtitle: "低毛利 · 高增长",
    color: "text-amber-900 dark:text-amber-200",
    bgClass: "bg-amber-500/10 border-amber-200 dark:border-amber-800 dark:bg-amber-500/15",
    strategy: "优化成本\n或放弃",
    action: "成本优化、考虑战略性保留或逐步退出",
  },
  DOG: {
    title: "瘦狗项目",
    subtitle: "低毛利 · 低增长",
    color: "text-red-800 dark:text-red-300",
    bgClass: "bg-red-500/10 border-red-200 dark:border-red-800 dark:bg-red-500/15",
    strategy: "逐步退出\n止损",
    action: "减少投入、逐步退出、释放资源",
  },
};

const PRIORITY_BADGE: Record<string, string> = {
  "最高": "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  "高": "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  "中": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "低": "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

const EVAL_INDICATORS = [
  { label: "毛利率", ranges: [
    { text: "≥30% 优秀", color: "text-emerald-600" },
    { text: "20-30% 良好", color: "text-blue-600" },
    { text: "<20% 危险", color: "text-red-600" },
  ]},
  { label: "增长率", ranges: [
    { text: "≥20% 高增", color: "text-emerald-600" },
    { text: "10-20% 稳增", color: "text-blue-600" },
    { text: "<10% 低增", color: "text-red-600" },
  ]},
  { label: "客户集中度", ranges: [
    { text: "≤20% 安全", color: "text-emerald-600" },
    { text: "20-40% 关注", color: "text-amber-600" },
    { text: ">40% 风险", color: "text-red-600" },
  ]},
  { label: "回款周期", ranges: [
    { text: "≤30天 优秀", color: "text-emerald-600" },
    { text: "30-60天 正常", color: "text-blue-600" },
    { text: ">60天 预警", color: "text-red-600" },
  ]},
  { label: "订单稳定性", ranges: [
    { text: "波动≤10%", color: "text-emerald-600" },
    { text: "波动10-20%", color: "text-amber-600" },
    { text: "波动>20%", color: "text-red-600" },
  ]},
];

const COUNTERMEASURES = [
  { trigger: "毛利率预警", condition: "< 15% 触发预警", action: "成本优化或提价", color: "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30" },
  { trigger: "客户集中度过高", condition: "> 30% 靠一客户", action: "拓展新客户分散", color: "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30" },
  { trigger: "回款周期过长", condition: "> 90 天账期", action: "加强催收或改善政策", color: "border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/30" },
  { trigger: "材料成本波动", condition: "占比 > 60%", action: "锁价协议或套期保值", color: "border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30" },
  { trigger: "价格战压力", condition: "竞品降价 > 10%", action: "差异化竞争策略", color: "border-purple-200 bg-purple-50 dark:border-purple-900 dark:bg-purple-950/30" },
  { trigger: "产能利用率", condition: "< 70%", action: "调整生产计划或接外单", color: "border-teal-200 bg-teal-50 dark:border-teal-900 dark:bg-teal-950/30" },
];

type CompassItemRow = {
  id: string;
  name: string;
  customerName: string;
  grossMargin: number;
  growth: number;
  quadrant: string;
  strategy: string;
  priority: string;
  sortOrder: number;
};

type AlertRuleRow = {
  id: string;
  conditionLabel: string;
  actionLabel: string;
  sortOrder: number;
};

type ItemWithEffectiveQ = CompassItemRow & { effectiveQuadrant: string };

function formatMargin(n: unknown): string {
  const x = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(x)) return "—";
  return `${Math.round(x * 100) / 100}%`;
}

function formatGrowth(n: unknown): string {
  const x = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(x)) return "—";
  const r = Math.round(x * 100) / 100;
  return `${r > 0 ? "+" : ""}${r}%`;
}

async function loadPageData(): Promise<{
  items: ItemWithEffectiveQ[];
  alertRules: AlertRuleRow[];
  quadrantThresholds: CompassQuadrantThresholds;
  thresholdPersisted: boolean;
  thresholdUpdatedAt: string | null;
  loadError: string | null;
}> {
  try {
    const [items, alertRules, thrRow] = await Promise.all([
      prisma.compassItem.findMany({ orderBy: { sortOrder: "asc" } }),
      prisma.compassAlertRule.findMany({ orderBy: { sortOrder: "asc" } }),
      tryGetCompassQuadrantThresholdRow(),
    ]);
    const quadrantThresholds: CompassQuadrantThresholds = {
      marginHighPct: thrRow.marginHighPct,
      growthHighPct: thrRow.growthHighPct,
    };
    const withQ: ItemWithEffectiveQ[] = items.map((i) => ({
      ...i,
      effectiveQuadrant: computeCompassQuadrant(
        i.grossMargin, i.growth, quadrantThresholds,
      ),
    }));
    return { items: withQ, alertRules, quadrantThresholds, thresholdPersisted: thrRow.persisted, thresholdUpdatedAt: thrRow.updatedAt, loadError: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const code = e && typeof e === "object" && "code" in e ? String((e as { code: unknown }).code) : "";
    const detail = [code && `代码 ${code}`, msg].filter(Boolean).join(" · ");
    return { items: [], alertRules: [], quadrantThresholds: { ...COMPASS_QUADRANT_DEFAULTS }, thresholdPersisted: false, thresholdUpdatedAt: null, loadError: detail || "未知错误" };
  }
}

export default async function CompassPage() {
  const {
    items, alertRules, quadrantThresholds, thresholdPersisted,
    thresholdUpdatedAt, loadError,
  } = await loadPageData();

  const quadrants = ["STAR", "CASH_COW", "QUESTION", "DOG"] as const;
  const byQuadrant = Object.fromEntries(
    quadrants.map((qk) => [qk, items.filter((i) => i.effectiveQuadrant === qk)]),
  ) as Record<string, ItemWithEffectiveQ[]>;

  return (
    <PageContainer className="space-y-8">
      {loadError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-100">
          <p className="font-semibold">数据加载失败</p>
          <p className="mt-2 whitespace-pre-wrap break-words font-mono text-xs opacity-90">{loadError}</p>
          <p className="mt-3 leading-relaxed text-red-900/90 dark:text-red-200/90">
            请在终端进入 <code className="rounded bg-red-100/80 px-1 dark:bg-red-900/50">profit-web</code> 目录依次执行：
          </p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs leading-relaxed">
            <li><code>npx prisma generate</code></li>
            <li><code>npm run db:repair</code>（若脚本不存在则 <code>npx prisma db push</code>）</li>
            <li>仅本地空库可 <code>npm run db:seed</code>；已有业务数据请 <code>npm run db:seed:reference</code></li>
            <li>重启 <code>npm run dev</code> 后刷新本页</li>
          </ol>
        </div>
      ) : null}

      <div>
        <h1 className="text-2xl font-bold tracking-tight">盈利管理分析罗盘</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          项目评估与对策矩阵——基于毛利率 × 增长率双维度分析（数据来自当前库）
        </p>
      </div>

      {/* ==================== 图5：四象限可视化 ==================== */}
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white">项目四象限分布</h2>
            <div className="flex items-center gap-2 text-[10px] text-zinc-500">
              <span>↑ 增长率</span>
              <span>→ 低增长</span>
            </div>
          </div>

          {/* 轴标注 */}
          <div className="relative">
            <div className="absolute -left-1 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] font-medium text-zinc-400">高毛利率</div>
            <div className="absolute -left-1 bottom-0 -rotate-90 origin-bottom-left translate-x-2 text-[10px] font-medium text-zinc-400">低毛利率</div>

            <div className="grid grid-cols-2 gap-2 rounded-xl border border-zinc-100 bg-zinc-50/50 p-3 dark:border-zinc-800 dark:bg-zinc-950/50">
              {/* 明星（左上）*/}
              <div className={`rounded-lg border p-4 ${Q_META.STAR.bgClass}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className={`text-sm font-bold ${Q_META.STAR.color}`}>{Q_META.STAR.title}</div>
                    <div className="text-[10px] text-zinc-500">{Q_META.STAR.subtitle}</div>
                  </div>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold text-white">
                    {byQuadrant.STAR?.length ?? 0}
                  </span>
                </div>
                <div className="mt-2 whitespace-pre-line text-[10px] text-emerald-700 dark:text-emerald-400">{Q_META.STAR.strategy}</div>
                <div className="mt-2 space-y-0.5">
                  {byQuadrant.STAR?.slice(0, 5).map((i) => (
                    <div key={i.id} className="flex items-center justify-between text-xs">
                      <span className="text-zinc-700 dark:text-zinc-300">#{i.sortOrder} {i.name}</span>
                      <span className="tabular-nums text-emerald-600">{formatMargin(i.grossMargin)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 现金牛（右上）*/}
              <div className={`rounded-lg border p-4 ${Q_META.CASH_COW.bgClass}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className={`text-sm font-bold ${Q_META.CASH_COW.color}`}>{Q_META.CASH_COW.title}</div>
                    <div className="text-[10px] text-zinc-500">{Q_META.CASH_COW.subtitle}</div>
                  </div>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-500 text-sm font-bold text-white">
                    {byQuadrant.CASH_COW?.length ?? 0}
                  </span>
                </div>
                <div className="mt-2 whitespace-pre-line text-[10px] text-sky-700 dark:text-sky-400">{Q_META.CASH_COW.strategy}</div>
                <div className="mt-2 space-y-0.5">
                  {byQuadrant.CASH_COW?.slice(0, 5).map((i) => (
                    <div key={i.id} className="flex items-center justify-between text-xs">
                      <span className="text-zinc-700 dark:text-zinc-300">#{i.sortOrder} {i.name}</span>
                      <span className="tabular-nums text-sky-600">{formatMargin(i.grossMargin)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 盈利平衡点标注 */}
              <div className="col-span-2 flex items-center justify-center py-1">
                <div className="rounded-full border border-zinc-300 bg-white px-3 py-0.5 text-[10px] font-medium text-zinc-500 shadow-sm dark:border-zinc-600 dark:bg-zinc-800">
                  盈利平衡 · 毛利率 {quadrantThresholds.marginHighPct}% / 增长 {quadrantThresholds.growthHighPct}%
                </div>
              </div>

              {/* 问题项目（左下）*/}
              <div className={`rounded-lg border p-4 ${Q_META.QUESTION.bgClass}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className={`text-sm font-bold ${Q_META.QUESTION.color}`}>{Q_META.QUESTION.title}</div>
                    <div className="text-[10px] text-zinc-500">{Q_META.QUESTION.subtitle}</div>
                  </div>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 text-sm font-bold text-white">
                    {byQuadrant.QUESTION?.length ?? 0}
                  </span>
                </div>
                <div className="mt-2 whitespace-pre-line text-[10px] text-amber-700 dark:text-amber-400">{Q_META.QUESTION.strategy}</div>
                <div className="mt-2 space-y-0.5">
                  {byQuadrant.QUESTION?.slice(0, 5).map((i) => (
                    <div key={i.id} className="flex items-center justify-between text-xs">
                      <span className="text-zinc-700 dark:text-zinc-300">#{i.sortOrder} {i.name}</span>
                      <span className="tabular-nums text-amber-600">{formatMargin(i.grossMargin)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 瘦狗（右下）*/}
              <div className={`rounded-lg border p-4 ${Q_META.DOG.bgClass}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className={`text-sm font-bold ${Q_META.DOG.color}`}>{Q_META.DOG.title}</div>
                    <div className="text-[10px] text-zinc-500">{Q_META.DOG.subtitle}</div>
                  </div>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-sm font-bold text-white">
                    {byQuadrant.DOG?.length ?? 0}
                  </span>
                </div>
                <div className="mt-2 whitespace-pre-line text-[10px] text-red-700 dark:text-red-400">{Q_META.DOG.strategy}</div>
                <div className="mt-2 space-y-0.5">
                  {byQuadrant.DOG?.slice(0, 5).map((i) => (
                    <div key={i.id} className="flex items-center justify-between text-xs">
                      <span className="text-zinc-700 dark:text-zinc-300">#{i.sortOrder} {i.name}</span>
                      <span className="tabular-nums text-red-600">{formatMargin(i.grossMargin)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <p className="mt-3 text-xs text-zinc-500">
            划分阈值（可在<Link href="/console/rules" className="font-medium underline">管理后台</Link>修改）：毛利率 ≥ {quadrantThresholds.marginHighPct}% 为「高毛利」，增长 ≥ {quadrantThresholds.growthHighPct}% 为「高增长」。
          </p>
        </section>

        {/* ==================== 右侧：评估指标 + 对策矩阵 ==================== */}
        <div className="space-y-4">
          {/* 项目评估指标——对应图5左侧指标 */}
          <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white">项目评估指标</h2>
            <div className="mt-3 space-y-3">
              {EVAL_INDICATORS.map((ind) => (
                <div key={ind.label}>
                  <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">{ind.label}</div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {ind.ranges.map((r) => (
                      <span key={r.text} className={`text-[10px] ${r.color}`}>{r.text}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 盈利管理对策——对应图5右侧 */}
          <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white">盈利管理对策</h2>
            <div className="mt-3 space-y-2">
              {COUNTERMEASURES.map((c) => (
                <div key={c.trigger} className={`rounded-lg border px-3 py-2 ${c.color}`}>
                  <div className="text-xs font-semibold">{c.trigger}</div>
                  <div className="text-[10px] text-zinc-600 dark:text-zinc-400">触发：{c.condition}</div>
                  <div className="text-[10px] text-zinc-700 dark:text-zinc-300">对策：{c.action}</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* ==================== 对策矩阵规则（库中配置） ==================== */}
      {!loadError && alertRules.length > 0 ? (
        <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white">盈利管理对策矩阵（可配置）</h2>
            <Link href="/console/rules" className="text-xs font-medium text-amber-700 hover:underline dark:text-amber-400">
              编辑规则 →
            </Link>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {alertRules.map((r) => (
              <div key={r.id} className="rounded-lg border border-zinc-100 px-3 py-2 dark:border-zinc-800">
                <div className="text-xs font-medium text-zinc-800 dark:text-zinc-200">{r.conditionLabel ?? "—"}</div>
                <div className="mt-0.5 text-[10px] text-zinc-600 dark:text-zinc-400">{r.actionLabel ?? "—"}</div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* ==================== 图5：项目评估示例表 ==================== */}
      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
          <h2 className="text-sm font-bold">项目评估示例</h2>
          <p className="mt-0.5 text-[10px] text-zinc-500">含象限归类、建议对策与优先级</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="border-b border-zinc-100 bg-zinc-50/80 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/50">
              <tr>
                <th className="px-4 py-3 font-medium">项目</th>
                <th className="px-4 py-3 font-medium">客户</th>
                <th className="px-4 py-3 text-right font-medium">毛利率</th>
                <th className="px-4 py-3 text-right font-medium">增长率</th>
                <th className="px-4 py-3 font-medium">象限</th>
                <th className="px-4 py-3 font-medium">建议对策</th>
                <th className="px-4 py-3 font-medium">优先级</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {items.map((i) => {
                const meta = Q_META[i.effectiveQuadrant] ?? Q_META.DOG;
                const priorityClass = PRIORITY_BADGE[i.priority] ?? PRIORITY_BADGE["中"];
                return (
                  <tr key={i.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-white">#{i.sortOrder} {i.name}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{i.customerName}</td>
                    <td className={`px-4 py-3 text-right tabular-nums font-medium ${i.grossMargin >= 30 ? "text-emerald-600" : i.grossMargin >= 20 ? "text-blue-600" : "text-red-600"}`}>
                      {formatMargin(i.grossMargin)}
                    </td>
                    <td className={`px-4 py-3 text-right tabular-nums font-medium ${i.growth >= 20 ? "text-emerald-600" : i.growth >= 10 ? "text-blue-600" : i.growth < 0 ? "text-red-600" : "text-zinc-600"}`}>
                      {formatGrowth(i.growth)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.bgClass.split(" ").slice(0, 1).join(" ")} ${meta.color}`}>
                        {meta.title}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-700 dark:text-zinc-300">{i.strategy}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${priorityClass}`}>
                        ☑ {i.priority}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {!loadError ? (
        <section className="rounded-xl border border-teal-200/80 bg-teal-50/50 p-4 text-sm shadow-sm dark:border-teal-900/40 dark:bg-teal-950/25">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-teal-900 dark:text-teal-200">
            阈值与规则来源
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-teal-950/90 dark:text-teal-100/90">
            四象限划分：毛利率 ≥ {quadrantThresholds.marginHighPct}% 视为「高毛利」，增长 ≥
            {quadrantThresholds.growthHighPct}% 视为「高增长」。
            {thresholdPersisted ? (
              <>
                当前数值来自数据库表 <code className="rounded bg-teal-100/80 px-1 dark:bg-teal-900/50">CompassQuadrantThreshold</code>
                {thresholdUpdatedAt ? `，最近更新 ${new Date(thresholdUpdatedAt).toLocaleString("zh-CN")}。` : "。"}
              </>
            ) : (
              <>
                未读到库中单例行，使用代码默认 {COMPASS_QUADRANT_DEFAULTS.marginHighPct}% / {COMPASS_QUADRANT_DEFAULTS.growthHighPct}%。
              </>
            )}
            对策矩阵条目来自表 <code className="rounded bg-teal-100/80 px-1 dark:bg-teal-900/50">CompassAlertRule</code>，可在{" "}
            <Link href="/console/rules" className="font-medium text-teal-800 underline dark:text-teal-300">管理后台 · 系数与规则</Link> 编辑。
          </p>
        </section>
      ) : null}
    </PageContainer>
  );
}
