import Link from "next/link";
import { CsvExportLink } from "@/components/CsvExportLink";
import { PageContainer } from "@/components/PageContainer";
import { prisma } from "@/lib/prisma";
import { enrichProject } from "@/lib/serialize";
import { projectStatusLabel } from "@/lib/display-labels";

export default async function ProjectsPage() {
  const raw = await prisma.project.findMany({
    orderBy: { updatedAt: "desc" },
    include: { customer: true, quote: true },
  });
  const projects = raw.map(enrichProject);

  return (
    <PageContainer className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">项目列表</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            点击项目进入智能报价工作台。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <CsvExportLink href="/api/export/projects">导出 CSV</CsvExportLink>
          <Link
            href="/projects/new"
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            新建报价
          </Link>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-100 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-950/50">
            <tr>
              <th className="px-4 py-3 font-medium">项目</th>
              <th className="px-4 py-3 font-medium">客户</th>
              <th className="px-4 py-3 font-medium">状态</th>
              <th className="px-4 py-3 font-medium text-right">建议价</th>
              <th className="px-4 py-3 font-medium text-right">毛利率</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {projects.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                  暂无项目。
                </td>
              </tr>
            ) : (
              projects.map((p) => (
                <tr key={p.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-950/40">
                  <td className="px-4 py-3">
                    <Link
                      href={`/projects/${p.id}`}
                      className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {p.customer.name}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                      {projectStatusLabel(p.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {p.quote
                      ? `¥${p.quote.suggestedPrice.toLocaleString("zh-CN")}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {p.quote && "computed" in p.quote
                      ? `${p.quote.computed.grossMarginAtSuggest}%`
                      : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </PageContainer>
  );
}
