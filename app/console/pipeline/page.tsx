import Link from "next/link";
import { CsvExportLink } from "@/components/CsvExportLink";
import { ProjectsCsvImport } from "@/components/ProjectsCsvImport";
import { prisma } from "@/lib/prisma";
import { enrichProject } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export default async function ConsolePipelinePage() {
  try {
    const raw = await prisma.project.findMany({
      orderBy: { updatedAt: "desc" },
      include: { customer: true, quote: true },
    });
    const projects = raw.map(enrichProject);

    return (
      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-200/90 bg-white/90 px-5 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            项目与审批总览
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            按状态总览商机，待审批行可直接进入前台工作台完成提交与审批闭环。
          </p>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            支持 CSV 导入导出，用于迁移历史项目或进行批量治理。
          </p>
          <CsvExportLink href="/api/export/projects">导出项目 CSV</CsvExportLink>
        </div>

        <ProjectsCsvImport />

        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="border-b border-zinc-100 bg-zinc-50 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/50">
              <tr>
                <th className="px-4 py-3">项目</th>
                <th className="px-4 py-3">客户</th>
                <th className="px-4 py-3">状态</th>
                <th className="px-4 py-3 text-right">建议价</th>
                <th className="px-4 py-3 text-right">建议毛利</th>
                <th className="px-4 py-3">待批角色</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {projects.map((p) => {
                const q = p.quote;
                const margin =
                  q && "computed" in q
                    ? `${q.computed.grossMarginAtSuggest}%`
                    : "—";
                return (
                  <tr key={p.id}>
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
                    <td className="px-4 py-3">{p.status}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {q ? `¥${q.suggestedPrice.toLocaleString("zh-CN")}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{margin}</td>
                    <td className="px-4 py-3 text-xs">
                      {q?.pendingRole ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  } catch {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-200">
          项目与审批数据暂不可用，已降级显示。你仍可继续访问其它页面与模块。
        </div>
        <ProjectsCsvImport />
      </div>
    );
  }
}
