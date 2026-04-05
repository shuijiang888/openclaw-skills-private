import Link from "next/link";
import { BossBriefingCard } from "@/components/BossBriefingCard";
import { PageContainer } from "@/components/PageContainer";
import { RoleHomePanel } from "@/components/RoleHomePanel";
import { buildBossBriefingFromProjects } from "@/lib/boss-briefing";
import { computePortfolioMetrics } from "@/lib/metrics";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ demo?: string }>;
}) {
  const demo = (await searchParams)?.demo;

  const [projectCount, customerCount, compassCount, pending, allProjects, recent] =
    await Promise.all([
      prisma.project.count(),
      prisma.customer.count(),
      prisma.compassItem.count(),
      prisma.project.count({ where: { status: "PENDING_APPROVAL" } }),
      prisma.project.findMany({
        include: { quote: true },
      }),
      prisma.project.findMany({
        take: 5,
        orderBy: { updatedAt: "desc" },
        include: { quote: true },
      }),
    ]);

  const customerIds = Array.from(
    new Set([...allProjects, ...recent].map((p) => p.customerId)),
  );
  const customers =
    customerIds.length > 0
      ? await prisma.customer.findMany({
          where: { id: { in: customerIds } },
          select: { id: true, name: true, tier: true },
        })
      : [];
  const customerMap = new Map(customers.map((c) => [c.id, c]));
  const allProjectsWithCustomer = allProjects.map((p) => ({
    ...p,
    customer: customerMap.get(p.customerId) ?? {
      id: p.customerId,
      name: "未知客户",
      tier: "NORMAL",
    },
  }));

  const vm = computePortfolioMetrics(allProjectsWithCustomer);

  const bossBriefing = buildBossBriefingFromProjects(allProjectsWithCustomer);

  const autoPct =
    vm.projectCount > 0
      ? Math.round((vm.autoChannelEligibleCount / vm.projectCount) * 1000) / 10
      : 0;

  return (
    <PageContainer className="space-y-8">
      {demo === "forbidden-console" ? (
        <div className="rounded-xl border border-amber-200/90 bg-amber-50/95 px-4 py-3 text-sm text-amber-950 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/35 dark:text-amber-100">
          已拦下对「管理后台」的访问：当前为业务线角色时，顶部导航不显示后台入口。
          演示模式请将右上角「试点角色」切换为「总经理」或「管理员」；登录模式请使用具备后台权限的账号。
        </div>
      ) : null}
      <RoleHomePanel />
      <div className="rounded-2xl border border-slate-200/90 bg-white/80 px-5 py-5 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/60 sm:px-6">
        <p className="text-[11px] font-semibold tracking-wide text-amber-800 dark:text-amber-400">
          经营简报
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          工作台 · 经营概览
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          一眼看到利润风险池、自动化潜力与审批队列。对外汇报时可配合「战略全文」中的价值叙事使用。
        </p>
      </div>

      <BossBriefingCard data={bossBriefing} />

      <section className="rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50/95 via-white to-slate-50/90 p-5 shadow-sm dark:border-amber-900/30 dark:from-amber-950/40 dark:via-slate-900 dark:to-slate-950">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            价值指标 · 试点看板
          </h2>
          <Link
            href="/about"
            className="text-xs font-semibold text-amber-800 hover:underline dark:text-amber-400"
          >
            价值主张摘要 →
          </Link>
        </div>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
          低毛利阈值 15%；自动通道口径与「智能分流」一致，可直接用于管理层汇报与试点复盘。
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              {
                label: "建议毛利低于 15% 的报价",
                value: vm.lowMarginQuoteCount,
                hint: "老板视角风险池",
              },
              {
                label: "满足自动通道测算",
                value: vm.autoChannelEligibleCount,
                hint: `占项目 ${autoPct}%`,
              },
              {
                label: "待审批",
                value: vm.pendingApprovalCount,
                hint: "与销售管理看板一致",
                href: "/projects",
              },
              {
                label: "已核准",
                value: vm.approvedCount,
                hint: "成交闭环（试点口径）",
              },
            ] as const
          ).map((c) =>
            "href" in c && c.href ? (
              <Link
                key={c.label}
                href={c.href}
                className="rounded-xl border border-slate-200/90 bg-white/95 p-3.5 shadow-sm transition hover:border-amber-200 dark:border-slate-700 dark:bg-slate-950/50 dark:hover:border-amber-900/50"
              >
                <div className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  {c.label}
                </div>
                <div className="mt-1 text-xl font-bold tabular-nums text-slate-900 dark:text-white">
                  {c.value}
                </div>
                <div className="mt-1 text-xs text-slate-500">{c.hint}</div>
              </Link>
            ) : (
              <div
                key={c.label}
                className="rounded-xl border border-slate-200/90 bg-white/95 p-3.5 shadow-sm dark:border-slate-700 dark:bg-slate-950/50"
              >
                <div className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  {c.label}
                </div>
                <div className="mt-1 text-xl font-bold tabular-nums text-slate-900 dark:text-white">
                  {c.value}
                </div>
                <div className="mt-1 text-xs text-slate-500">{c.hint}</div>
              </div>
            ),
          )}
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "项目", value: projectCount },
          { label: "客户", value: customerCount },
          { label: "罗盘项目", value: compassCount },
          { label: "待审批", value: pending, href: "/projects" },
        ].map((c) =>
          c.href ? (
            <Link
              key={c.label}
              href={c.href}
              className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-600"
            >
              <div className="text-xs font-medium text-slate-600 dark:text-slate-400">
                {c.label}
              </div>
              <div className="mt-2 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                {c.value}
              </div>
            </Link>
          ) : (
            <div
              key={c.label}
              className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="text-xs font-medium text-slate-600 dark:text-slate-400">
                {c.label}
              </div>
              <div className="mt-2 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                {c.value}
              </div>
            </div>
          ),
        )}
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/50">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">最近项目</h2>
          <Link
            href="/projects"
            className="text-sm font-semibold text-amber-700 hover:text-amber-600 dark:text-amber-400"
          >
            查看全部 →
          </Link>
        </div>
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {recent.length === 0 ? (
            <li className="px-4 py-6 text-sm text-slate-500">
              暂无数据，请先{" "}
              <Link href="/projects/new" className="font-semibold text-amber-700 dark:text-amber-400">
                新建报价
              </Link>
              ；仅本地空库可执行{" "}
              <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">npm run db:seed</code>
              ，已有业务数据请以 CSV 导入或手工维护为主（勿对真库全量 seed）。
            </li>
          ) : (
            recent.map((p) => (
              <li key={p.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <Link
                    href={`/projects/${p.id}`}
                    className="font-semibold text-slate-900 hover:text-amber-800 dark:text-white dark:hover:text-amber-400"
                  >
                    {p.name}
                  </Link>
                  <div className="text-xs text-slate-500">
                    {customerMap.get(p.customerId)?.name ?? "未知客户"} · {p.status}
                    {p.quote
                      ? ` · 建议价 ¥${p.quote.suggestedPrice.toLocaleString("zh-CN")}`
                      : ""}
                  </div>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  进入
                </span>
              </li>
            ))
          )}
        </ul>
      </section>

      <p className="text-xs text-slate-500">
        设计文档 <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">docs/DESIGN.md</code>
        ；战略打包{" "}
        <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">
          docs/VALUE_STRATEGY_DEPLOYMENT_ROADMAP.md
        </code>
        ；角色与流程说明 <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">docs/DEMO_GUIDE.md</code>
        。
      </p>
    </PageContainer>
  );
}
