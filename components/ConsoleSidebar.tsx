"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDemoRole } from "@/components/RoleSwitcher";
import { filterConsoleSidebarForRole } from "@/lib/demo-role-modules";
import { parseDemoRole } from "@/lib/approval";

export function ConsoleSidebar() {
  const pathname = usePathname();
  const role = parseDemoRole(useDemoRole());
  const items = filterConsoleSidebarForRole(role);

  const foot =
    role === "VP"
      ? "VP：主数据、系数与规则、种子测试运营、CSV 导入及智能体审计。"
      : "销售经理：控制台摘要、客户主数据只读、Deal Desk 队列、种子测试状态跟进；Owner/评分请 VP 维护。";

  return (
    <aside className="w-48 shrink-0">
      <div className="rounded-2xl border border-slate-200/90 bg-white p-3 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-2 px-2 text-[10px] font-semibold tracking-wide text-amber-800 dark:text-amber-400">
          管理控制台
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
