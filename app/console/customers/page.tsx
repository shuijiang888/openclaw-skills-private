import Link from "next/link";
import { CsvExportLink } from "@/components/CsvExportLink";
import { CustomerCsvImport } from "@/components/CustomerCsvImport";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ConsoleCustomersPage() {
  try {
    const rows = await prisma.customer.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { projects: true } } },
    });

    return (
      <div className="space-y-5">
        <section className="rounded-2xl border border-slate-200/90 bg-white/85 px-5 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <p className="text-[11px] font-semibold tracking-wide text-amber-800 dark:text-amber-400">
            主数据管理
          </p>
          <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
            客户库与评级
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            客户评级影响「人机分流」与话术建议；可在前台「新建报价」时继续新增客户。
          </p>
        </section>

        <CustomerCsvImport />

        <div className="flex flex-wrap gap-2">
          <CsvExportLink href="/api/export/customers">导出客户 CSV</CsvExportLink>
          <Link
            href="/projects/new"
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-violet-600 dark:hover:bg-violet-500"
          >
            去前台新增客户
          </Link>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/80 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">客户</th>
                <th className="px-4 py-3">评级</th>
                <th className="px-4 py-3 text-right">账期(天)</th>
                <th className="px-4 py-3 text-right">项目数</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                    {c.name}
                  </td>
                  <td className="px-4 py-3">{c.tier}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{c.arDays}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {c._count.projects}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  } catch {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-200">
          客户主数据暂时不可用，系统已降级显示。你可先继续测试其它页面。
        </div>
      </div>
    );
  }
}
