import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ConsoleHomePage() {
  try {
    const [stats, pendingList] = await Promise.all([
      Promise.all([
        prisma.customer.count(),
        prisma.project.count(),
        prisma.project.count({ where: { status: "PENDING_APPROVAL" } }),
        prisma.project.count({ where: { status: "APPROVED" } }),
        prisma.compassItem.count(),
        prisma.quote.aggregate({ _avg: { suggestedPrice: true } }),
      ]),
      prisma.project.findMany({
        where: { status: "PENDING_APPROVAL" },
        take: 5,
        orderBy: { updatedAt: "desc" },
        include: { customer: true, quote: true },
      }),
    ]);

    const [customers, projects, pending, approved, compass, agg] = stats;
    const avg = agg._avg.suggestedPrice ?? 0;

    return (
      <div className="space-y-8">
        <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white via-slate-50 to-amber-50/70 px-5 py-5 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-amber-950/20">
          <p className="text-[11px] font-semibold tracking-wide text-amber-800 dark:text-amber-300">
            Console Overview
          </p>
          <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
            运营配置总览
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            聚合查看客户主数据、审批队列与成交节奏，支持你在后台快速定位经营动作优先级。
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { k: "客户主数据", v: customers, href: "/console/customers" },
            { k: "项目总数", v: projects, href: "/console/pipeline" },
            { k: "待审批", v: pending, href: "/console/pipeline" },
            { k: "已核准成交", v: approved, href: "/console/pipeline" },
            { k: "罗盘项目", v: compass, href: "/compass" },
            {
              k: "平均建议价（全库）",
              v: `¥${Math.round(avg).toLocaleString("zh-CN")}`,
              href: "/console/pipeline",
            },
          ].map((x) => (
            <Link
              key={x.k}
              href={x.href}
              className="rounded-xl border border-slate-200/90 bg-white/95 p-4 shadow-sm transition hover:border-amber-200 dark:border-slate-700 dark:bg-slate-900/80 dark:hover:border-amber-900/60"
            >
              <div className="text-xs text-slate-500">{x.k}</div>
              <div className="mt-1 text-xl font-semibold tabular-nums text-slate-900 dark:text-white">
                {x.v}
              </div>
            </Link>
          ))}
        </div>

        <section className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <h2 className="text-sm font-medium">待审批队列（Top 5）</h2>
            <Link
              href="/console/pipeline"
              className="text-sm text-amber-700 hover:underline dark:text-amber-400"
            >
              查看全部
            </Link>
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {pendingList.length === 0 ? (
              <li className="px-4 py-6 text-sm text-slate-500">当前无待审批项目。</li>
            ) : (
              pendingList.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
                >
                  <div>
                    <Link
                      href={`/projects/${p.id}`}
                      className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {p.name}
                    </Link>
                    <div className="text-xs text-slate-500">
                      {p.customer.name} · 待角色 {p.quote?.pendingRole ?? "—"}
                    </div>
                  </div>
                  <div className="text-right text-sm tabular-nums">
                    {p.quote
                      ? `建议 ¥${p.quote.suggestedPrice.toLocaleString("zh-CN")}`
                      : ""}
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    );
  } catch {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
          后台总览数据暂不可用，系统已降级显示。请先继续使用项目与智探007页面进行验证。
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {["客户主数据", "项目总数", "待审批", "已核准成交", "罗盘项目", "平均建议价（全库）"].map(
            (k) => (
              <div
                key={k}
                className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="text-xs text-slate-500">{k}</div>
                <div className="mt-1 text-xl font-semibold tabular-nums">—</div>
              </div>
            ),
          )}
        </div>
      </div>
    );
  }
}
