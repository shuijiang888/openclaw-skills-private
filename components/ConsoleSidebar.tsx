"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDemoRole } from "@/components/RoleSwitcher";
import {
  filterConsoleSidebarForRole,
  filterZtConsoleSidebarForRole,
} from "@/lib/demo-role-modules";
import { parseDemoRole } from "@/lib/approval";

export function ConsoleSidebar() {
  const pathname = usePathname();
  const role = parseDemoRole(useDemoRole());
  const isZtConsoleContext =
    pathname.startsWith("/console/system") ||
    pathname.startsWith("/console/users") ||
    pathname.startsWith("/console/zt-system") ||
    pathname.startsWith("/console/zt-users");
  const items = isZtConsoleContext
    ? filterZtConsoleSidebarForRole(role)
    : filterConsoleSidebarForRole(role);

  const foot = isZtConsoleContext
    ? role === "ADMIN"
      ? "智探管理员：系统开关、用户组织、兑换审核与策略治理。"
      : "智探总经理：可查看系统态势与用户组织；策略写入与审核建议由管理员执行。"
    : role === "ADMIN"
      ? "管理员：主数据、系数与规则、CSV 导入及智能体审计。"
      : "总经理：控制台摘要、客户主数据只读、项目审批；导入与规则维护请管理员。";

  return (
    <aside className="w-48 shrink-0">
      <div className="rounded-2xl border border-slate-200/90 bg-white p-3 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-2 px-2 text-[10px] font-semibold tracking-wide text-amber-800 dark:text-amber-400">
          {isZtConsoleContext ? "智探007管理控制台" : "管理控制台"}
        </div>
        <nav className="flex flex-col gap-1">
          {items.map((it) => {
            const active =
              pathname === it.href ||
              (it.href !== "/console" && pathname.startsWith(it.href));
            return (
              <Link
                key={it.href}
                href={it.href}
                className={`rounded-lg px-2 py-2 font-medium transition ${
                  active
                    ? "bg-slate-900 text-white shadow-sm dark:bg-amber-500 dark:text-slate-950"
                    : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                {it.label}
              </Link>
            );
          })}
        </nav>
        <p className="mt-3 border-t border-slate-100 px-2 pt-3 text-xs leading-relaxed text-slate-500 dark:border-slate-800">
          {foot}
        </p>
      </div>
    </aside>
  );
}
