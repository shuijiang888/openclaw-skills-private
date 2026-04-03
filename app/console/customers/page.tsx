import Link from "next/link";
import { CsvExportLink } from "@/components/CsvExportLink";
import { CustomerCsvImport } from "@/components/CustomerCsvImport";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ConsoleCustomersPage() {
  const rows = await prisma.customer.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { projects: true } } },
  });

  return (
    <div className="space-y-4">
      <CustomerCsvImport />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          客户评级影响「人机分流」与话术建议；可在前台「新建报价」时继续新增客户。
        </p>
        <div className="flex flex-wrap gap-2">
          <CsvExportLink href="/api/export/customers">导出客户 CSV</CsvExportLink>
          <Link
            href="/projects/new"
            className="rounded-lg bg-zinc-900 px-3 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            去前台新增客户
          </Link>
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-100 bg-zinc-50 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/50">
            <tr>
              <th className="px-4 py-3">客户</th>
              <th className="px-4 py-3">评级</th>
              <th className="px-4 py-3 text-right">账期(天)</th>
              <th className="px-4 py-3 text-right">项目数</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {rows.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3 font-medium">{c.name}</td>
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
}
