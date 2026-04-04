import { CompassAlertRulesEditor } from "@/components/CompassAlertRulesEditor";
import { CompassQuadrantThresholdEditor } from "@/components/CompassQuadrantThresholdEditor";
import { CompassAlertRulesCsvImport } from "@/components/CompassAlertRulesCsvImport";
import {
  APPROVAL_DISCOUNT_BANDS,
  COEFFICIENT_DEFAULTS,
  SHUNT_RULE_SUMMARY,
} from "@/lib/business-config";
import { loadCompassQuadrantThresholdsSafe } from "@/lib/load-compass-quadrant-threshold";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ConsoleRulesPage() {
  const [compassAlertRules, quadrantThresholdInitial] = await Promise.all([
    prisma.compassAlertRule.findMany({
      orderBy: { sortOrder: "asc" },
    }),
    loadCompassQuadrantThresholdsSafe(),
  ]);

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-medium text-zinc-500">默认报价系数（系统默认）</h2>
        <p className="mt-1 text-xs text-zinc-500">
          新建项目时 API 使用的默认值；前台可在单票上覆盖。
        </p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
          {Object.entries(COEFFICIENT_DEFAULTS).map(([k, v]) => (
            <div
              key={k}
              className="flex justify-between rounded-lg border border-zinc-100 px-3 py-2 dark:border-zinc-800"
            >
              <dt className="text-zinc-500">{k}</dt>
              <dd className="font-mono tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-medium text-zinc-500">Deal Desk 分层（折扣区间）</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {APPROVAL_DISCOUNT_BANDS.map((b) => (
            <li
              key={b.role}
              className="rounded-lg border border-zinc-100 px-3 py-2 dark:border-zinc-800"
            >
              <span className="font-medium">{b.label}</span>
              <span className="ml-2 text-zinc-500">还价折扣 {b.range}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-medium text-zinc-500">自动报价通道条件摘要</h2>
        <ul className="mt-3 list-inside list-disc text-sm text-zinc-700 dark:text-zinc-300">
          {SHUNT_RULE_SUMMARY.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-medium text-zinc-500">客户价值罗盘 · 四象限划分阈值</h2>
        <p className="mt-1 text-xs text-zinc-500">
          数据表{" "}
          <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
            CompassQuadrantThreshold
          </code>
          （单例 <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">default</code>
          ）。未落库时使用代码默认 60% / 60%。
        </p>
        <div className="mt-4">
          <CompassQuadrantThresholdEditor initial={quadrantThresholdInitial} />
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-medium text-zinc-500">客户价值罗盘 · 预警对策矩阵</h2>
        <p className="mt-1 text-xs text-zinc-500">
          与前台「客户价值罗盘」侧栏同源；数据表{" "}
          <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
            CompassAlertRule
          </code>
          。可在下方直接增删改；仅本地空库可用全量{" "}
          <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
            db:seed
          </code>{" "}
          重置示例，真库请以手工与导入为主。
        </p>
        <div className="mt-4 space-y-4">
          <CompassAlertRulesCsvImport />
          <CompassAlertRulesEditor initial={compassAlertRules} />
        </div>
      </section>
    </div>
  );
}
