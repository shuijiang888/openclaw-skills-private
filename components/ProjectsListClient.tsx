"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CsvExportLink } from "@/components/CsvExportLink";
import { useDemoRole } from "@/components/RoleSwitcher";
import { canApprove, parseDemoRole } from "@/lib/approval";
import { demoRoleLabelForUi, projectStatusLabel } from "@/lib/display-labels";

export type ProjectListRow = {
  id: string;
  name: string;
  customerName: string;
  status: string;
  suggestedPrice: number | null;
  grossMarginAtSuggest: number | null;
  pendingRole: string | null;
};

type FilterKey = "all" | "pending_any" | "pending_mine";

function filterLabel(f: FilterKey): string {
  switch (f) {
    case "all":
      return "全部";
    case "pending_any":
      return "待审批";
    case "pending_mine":
      return "待我处理";
    default:
      return f;
  }
}

export function ProjectsListClient({ rows }: { rows: ProjectListRow[] }) {
  const searchParams = useSearchParams();
  const demoRole = parseDemoRole(useDemoRole());
  const [filter, setFilter] = useState<FilterKey>("all");

  useEffect(() => {
    const focus = searchParams.get("focus");
    if (focus === "my-queue") setFilter("pending_mine");
  }, [searchParams]);

  const myPendingCount = useMemo(
    () =>
      rows.filter((r) => {
        if (r.status !== "PENDING_APPROVAL" || !r.pendingRole) return false;
        const need = parseDemoRole(r.pendingRole);
        return canApprove(demoRole, need);
      }).length,
    [rows, demoRole],
  );

  const pendingAnyCount = useMemo(
    () =>
      rows.filter((r) => r.status === "PENDING_APPROVAL" && r.pendingRole)
        .length,
    [rows],
  );

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (filter === "all") return true;
      const isPending =
        r.status === "PENDING_APPROVAL" && Boolean(r.pendingRole);
      if (filter === "pending_any") return isPending;
      if (filter === "pending_mine") {
        if (!isPending || !r.pendingRole) return false;
        return canApprove(demoRole, parseDemoRole(r.pendingRole));
      }
      return true;
    });
  }, [rows, filter, demoRole]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">项目列表</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            点击项目进入智能报价工作台。筛选随右上角「试点角色」（演示模式）或会话角色（登录模式）与待审角色联动。
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

      <div className="flex flex-wrap gap-2">
        {(["all", "pending_any", "pending_mine"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              filter === f
                ? "bg-violet-600 text-white dark:bg-violet-500"
                : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            }`}
          >
            {filterLabel(f)}
            {f === "pending_mine" ? ` (${myPendingCount})` : null}
            {f === "pending_any" ? ` (${pendingAnyCount})` : null}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-100 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-950/50">
            <tr>
              <th className="px-4 py-3 font-medium">项目</th>
              <th className="px-4 py-3 font-medium">客户</th>
              <th className="px-4 py-3 font-medium">状态</th>
              <th className="px-4 py-3 font-medium">待审角色</th>
              <th className="px-4 py-3 font-medium text-right">建议价</th>
              <th className="px-4 py-3 font-medium text-right">毛利率</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                  {filter === "pending_mine"
                    ? "当前身份下暂无待您处理的审批。"
                    : "暂无项目。"}
                </td>
              </tr>
            ) : (
              filtered.map((p) => {
                const isMine =
                  p.status === "PENDING_APPROVAL" &&
                  p.pendingRole &&
                  canApprove(demoRole, parseDemoRole(p.pendingRole));
                return (
                  <tr
                    key={p.id}
                    className={`hover:bg-zinc-50/50 dark:hover:bg-zinc-950/40 ${
                      isMine
                        ? "bg-amber-50/90 dark:bg-amber-950/25"
                        : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/projects/${p.id}`}
                        className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                      >
                        {p.name}
                      </Link>
                      {isMine ? (
                        <span className="ml-2 rounded bg-amber-200/80 px-1.5 py-0.5 text-[10px] font-semibold text-amber-950 dark:bg-amber-800/50 dark:text-amber-100">
                          待我处理
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {p.customerName}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                        {projectStatusLabel(p.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-600 dark:text-zinc-400">
                      {p.pendingRole
                        ? demoRoleLabelForUi(p.pendingRole)
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {p.suggestedPrice != null
                        ? `¥${p.suggestedPrice.toLocaleString("zh-CN")}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {p.grossMarginAtSuggest != null
                        ? `${p.grossMarginAtSuggest}%`
                        : "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
