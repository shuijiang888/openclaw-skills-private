import Link from "next/link";
import { PageContainer } from "@/components/PageContainer";
import {
  COMPASS_QUADRANT_DEFAULTS,
  computeCompassQuadrant,
  type CompassQuadrantThresholds,
} from "@/lib/compass-quadrant";
import { tryGetCompassQuadrantThresholdRow } from "@/lib/load-compass-quadrant-threshold";
import { prisma } from "@/lib/prisma";

/** 避免静态缓存导致旧构建/旧库逻辑残留；保证每次请求都读当前 SQLite */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const Q_LABEL: Record<string, { title: string; color: string }> = {
  STAR: {
    title: "高价值·高赢单",
    color: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",
  },
  CASH_COW: {
    title: "高价值·低赢单",
    color: "bg-sky-500/15 text-sky-800 dark:text-sky-300",
  },
  QUESTION: {
    title: "低价值·高赢单",
    color: "bg-amber-500/15 text-amber-900 dark:text-amber-200",
  },
  DOG: { title: "低价值·低赢单", color: "bg-red-500/15 text-red-800 dark:text-red-300" },
};

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
      prisma.compassItem.findMany({
        orderBy: { sortOrder: "asc" },
      }),
      prisma.compassAlertRule.findMany({
        orderBy: { sortOrder: "asc" },
      }),
      tryGetCompassQuadrantThresholdRow(),
    ]);
    const quadrantThresholds: CompassQuadrantThresholds = {
      marginHighPct: thrRow.marginHighPct,
      growthHighPct: thrRow.growthHighPct,
    };
    const withQ: ItemWithEffectiveQ[] = items.map((i) => ({
      ...i,
      effectiveQuadrant: computeCompassQuadrant(
        i.grossMargin,
        i.growth,
        quadrantThresholds,
      ),
    }));
    return {
      items: withQ,
      alertRules,
      quadrantThresholds,
      thresholdPersisted: thrRow.persisted,
      thresholdUpdatedAt: thrRow.updatedAt,
      loadError: null,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const code =
      e && typeof e === "object" && "code" in e
        ? String((e as { code: unknown }).code)
        : "";
    const detail = [code && `代码 ${code}`, msg].filter(Boolean).join(" · ");
    return {
      items: [],
      alertRules: [],
      quadrantThresholds: { ...COMPASS_QUADRANT_DEFAULTS },
      thresholdPersisted: false,
      thresholdUpdatedAt: null,
      loadError: detail || "未知错误",
    };
  }
}

export default async function CompassPage() {
  const {
    items,
    alertRules,
    quadrantThresholds,
    thresholdPersisted,
    thresholdUpdatedAt,
    loadError,
  } = await loadPageData();

  return (
    <PageContainer className="space-y-8">
      {loadError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-100">
          <p className="font-semibold">数据加载失败</p>
          <p className="mt-2 whitespace-pre-wrap break-words font-mono text-xs opacity-90">
            {loadError}
          </p>
          <p className="mt-3 leading-relaxed text-red-900/90 dark:text-red-200/90">
            请在本机打开终端，进入{" "}
            <code className="rounded bg-red-100/80 px-1 dark:bg-red-900/50">
              profit-web
            </code>{" "}
            目录后依次执行：
          </p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs leading-relaxed">
            <li>
              <code>npx prisma generate</code>
            </li>
            <li>
              <code>npm run db:repair</code>（若脚本不存在则{" "}
              <code>npx prisma db push</code>）
            </li>
            <li>
              仅本地空库可 <code>npm run db:seed</code>；已有业务数据请{" "}
              <code>npm run db:seed:reference</code> 补齐罗盘配置，勿全量 seed
            </li>
            <li>重启 <code>npm run dev</code> 后刷新本页</li>
          </ol>
        </div>
      ) : null}

      <div>
        <h1 className="text-2xl font-semibold">客户价值罗盘</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          基于「客户价值 × 赢单概率」的象限与对策规则（数据来自当前库；规则可在后台维护或 CSV 导入）。
        </p>
      </div>

      {!loadError ? (
        <section className="rounded-xl border border-teal-200/80 bg-teal-50/50 p-4 text-sm shadow-sm dark:border-teal-900/40 dark:bg-teal-950/25">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-teal-900 dark:text-teal-200">
            阈值与规则来源（B1）
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-teal-950/90 dark:text-teal-100/90">
            四象限划分：客户价值 ≥ {quadrantThresholds.marginHighPct}% 视为「高价值」，赢单概率 ≥
            {quadrantThresholds.growthHighPct}% 视为「高赢单」；象限由二者与{" "}
            <code className="rounded bg-teal-100/80 px-1 dark:bg-teal-900/50">
              lib/compass-quadrant.ts
            </code>{" "}
            计算，与条目上存量的{" "}
            <code className="rounded bg-teal-100/80 px-1 dark:bg-teal-900/50">
              quadrant
            </code>{" "}
            无关。
            {thresholdPersisted ? (
              <>
                {" "}
                当前数值来自数据库表{" "}
                <code className="rounded bg-teal-100/80 px-1 dark:bg-teal-900/50">
                  CompassQuadrantThreshold
                </code>
                （单例 default）
                {thresholdUpdatedAt
                  ? `，最近更新 ${new Date(thresholdUpdatedAt).toLocaleString("zh-CN")}。`
                  : "。"}
              </>
            ) : (
              <>
                {" "}
                未读到库中单例行，使用代码默认{" "}
                {COMPASS_QUADRANT_DEFAULTS.marginHighPct}% /{" "}
                {COMPASS_QUADRANT_DEFAULTS.growthHighPct}%。
              </>
            )}
            对策矩阵条目来自表{" "}
            <code className="rounded bg-teal-100/80 px-1 dark:bg-teal-900/50">
              CompassAlertRule
            </code>
            ，可在{" "}
            <Link
              href="/console/rules"
              className="font-medium text-teal-800 underline decoration-teal-400/60 underline-offset-2 hover:text-teal-900 dark:text-teal-300 dark:hover:text-teal-200"
            >
              管理后台 · 系数与规则
            </Link>{" "}
            编辑（须 VP：演示模式 x-demo-role: VP，或登录模式 VP 账号）。
          </p>
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-medium text-zinc-500">四象限（客户价值 × 赢单概率）</h2>
          <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl border border-zinc-100 bg-zinc-50/50 p-3 text-sm dark:border-zinc-800 dark:bg-zinc-950/50">
            <div className="rounded-lg bg-emerald-500/10 p-4 dark:bg-emerald-500/15">
              <div className="text-xs font-medium text-emerald-800 dark:text-emerald-300">
                高价值 · 高赢单
              </div>
              <div className="mt-2 space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                {items
                  .filter((i) => i.effectiveQuadrant === "STAR")
                  .map((i) => (
                    <div key={i.id}>
                      #{i.sortOrder} {i.name}
                    </div>
                  ))}
              </div>
            </div>
            <div className="rounded-lg bg-sky-500/10 p-4 dark:bg-sky-500/15">
              <div className="text-xs font-medium text-sky-800 dark:text-sky-300">
                高价值 · 低赢单
              </div>
              <div className="mt-2 space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                {items
                  .filter((i) => i.effectiveQuadrant === "CASH_COW")
                  .map((i) => (
                    <div key={i.id}>
                      #{i.sortOrder} {i.name}
                    </div>
                  ))}
              </div>
            </div>
            <div className="rounded-lg bg-amber-500/10 p-4 dark:bg-amber-500/15">
              <div className="text-xs font-medium text-amber-900 dark:text-amber-200">
                低价值 · 高赢单
              </div>
              <div className="mt-2 space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                {items
                  .filter((i) => i.effectiveQuadrant === "QUESTION")
                  .map((i) => (
                    <div key={i.id}>
                      #{i.sortOrder} {i.name}
                    </div>
                  ))}
              </div>
            </div>
            <div className="rounded-lg bg-red-500/10 p-4 dark:bg-red-500/15">
              <div className="text-xs font-medium text-red-800 dark:text-red-300">
                低价值 · 低赢单
              </div>
              <div className="mt-2 space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                {items
                  .filter((i) => i.effectiveQuadrant === "DOG")
                  .map((i) => (
                    <div key={i.id}>
                      #{i.sortOrder} {i.name}
                    </div>
                  ))}
              </div>
            </div>
          </div>
          <p className="mt-3 text-xs text-zinc-500">
            当前划分阈值（可在管理后台「系数与规则」修改）：客户价值 ≥
            {quadrantThresholds.marginHighPct}% 为「高价值」，赢单概率 ≥
            {quadrantThresholds.growthHighPct}% 为「高赢单」。四象限由两项 KPI
            按此即时计算。
          </p>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-medium text-zinc-500">对策矩阵</h2>
          <p className="mt-1 text-xs text-zinc-500">
            规则存库，可通过参考 seed、手工编辑或 CSV 批量导入初始化；「系数与规则」页可对照维护。
          </p>
          <ul className="mt-3 space-y-2 text-xs">
            {alertRules.map((r) => (
              <li
                key={r.id}
                className="rounded-lg border border-zinc-100 px-3 py-2 dark:border-zinc-800"
              >
                <div className="font-medium text-zinc-800 dark:text-zinc-200">
                  {r.conditionLabel ?? "—"}
                </div>
                <div className="text-zinc-600 dark:text-zinc-400">
                  {r.actionLabel ?? "—"}
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
          <h2 className="text-sm font-medium">项目评估示例</h2>
        </div>
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-zinc-100 bg-zinc-50/80 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/50">
            <tr>
              <th className="px-4 py-3">项目</th>
              <th className="px-4 py-3">客户</th>
              <th className="px-4 py-3 text-right">客户价值</th>
              <th className="px-4 py-3 text-right">赢单概率</th>
              <th className="px-4 py-3">象限</th>
              <th className="px-4 py-3">策略</th>
              <th className="px-4 py-3">优先级</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {items.map((i) => {
              const meta = Q_LABEL[i.effectiveQuadrant] ?? {
                title: i.effectiveQuadrant,
                color: "bg-zinc-100 text-zinc-800",
              };
              return (
                <tr key={i.id}>
                  <td className="px-4 py-3 font-medium">{i.name}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {i.customerName}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatMargin(i.grossMargin)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatGrowth(i.growth)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${meta.color}`}
                    >
                      {meta.title}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                    {i.strategy}
                  </td>
                  <td className="px-4 py-3">{i.priority}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </PageContainer>
  );
}
