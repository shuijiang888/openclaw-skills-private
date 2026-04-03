import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function ConsoleHomePage() {
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
            className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
          >
            <div className="text-xs text-zinc-500">{x.k}</div>
            <div className="mt-1 text-xl font-semibold tabular-nums">{x.v}</div>
          </Link>
        ))}
      </div>

      <section className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
          <h2 className="text-sm font-medium">待审批队列（Top 5）</h2>
          <Link
            href="/console/pipeline"
            className="text-sm text-blue-600 dark:text-blue-400"
          >
            查看全部
          </Link>
        </div>
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {pendingList.length === 0 ? (
            <li className="px-4 py-6 text-sm text-zinc-500">当前无待审批项目。</li>
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
                  <div className="text-xs text-zinc-500">
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
}
