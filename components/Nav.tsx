"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BrandMark } from "./BrandMark";
import { FxiaokeBrandBadge } from "./FxiaokeBrandBadge";
import { RoleSwitcher, useDemoRole } from "./RoleSwitcher";
import { canAccessConsole, filterNavLinksForRole } from "@/lib/demo-role-modules";
import { parseDemoRole } from "@/lib/approval";
import { usePathname } from "next/navigation";

export function Nav() {
  const role = parseDemoRole(useDemoRole());
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isZtContext =
    pathname.startsWith("/zt007") ||
    pathname.startsWith("/personal") ||
    pathname.startsWith("/console/system") ||
    pathname.startsWith("/console/users") ||
    pathname.startsWith("/console/zt-system") ||
    pathname.startsWith("/console/zt-users");

  const ztLinks = [
    { href: "/", label: "门户" },
    { href: "/zt007", label: "智探007总览" },
    { href: "/zt007/strategist", label: "AI大军师" },
    { href: "/zt007/action", label: "行动中心" },
    { href: "/zt007/bounty", label: "悬赏任务" },
    { href: "/zt007/honor", label: "荣誉积分" },
    { href: "/personal", label: "我的战情台" },
    ...(canAccessConsole(role)
      ? [
          { href: "/console/system", label: "系统维护" },
          { href: "/console/users", label: "用户组织" },
        ]
      : []),
  ];
  const links = isZtContext ? ztLinks : filterNavLinksForRole(role);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/90 bg-white/90 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/90">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-5 lg:gap-8">
          <div className="flex min-w-0 flex-wrap items-center gap-3 sm:gap-4">
            <Link href="/" className="flex min-w-0 items-center gap-3">
              <BrandMark />
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold tracking-tight text-slate-900 dark:text-white">
                  {isZtContext ? "智探007 作战协同系统" : "智能盈利管理系统"}
                </div>
                <div className="truncate text-[11px] font-medium tracking-wide text-amber-800/90 dark:text-amber-400/90">
                  {isZtContext
                    ? "情报 · 行动 · 积分 · 组织"
                    : "报价 · 审批 · 盈利结构"}
                </div>
              </div>
            </Link>
            <div
              className="hidden h-9 w-px shrink-0 bg-slate-200 sm:block dark:bg-slate-700"
              aria-hidden
            />
            {!isZtContext ? (
              <div className="flex min-w-0 flex-col gap-1">
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  联合呈现
                </span>
                <FxiaokeBrandBadge variant="compact" />
              </div>
            ) : null}
          </div>
          <nav className="hidden flex-wrap gap-1 text-[13px] font-medium text-slate-600 lg:flex dark:text-slate-400">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-md px-2.5 py-1.5 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
          <Link
            href={isZtContext ? "/zt007" : "/dashboard"}
            className="hidden rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 sm:inline-flex dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400"
          >
            {isZtContext ? "进入智探007" : "进入系统"}
          </Link>
          <RoleSwitcher />
          <button
            type="button"
            aria-expanded={mobileOpen}
            aria-controls="mobile-main-nav"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 lg:hidden dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <span aria-hidden>{mobileOpen ? "✕" : "☰"}</span>
            {mobileOpen ? "收起导航" : "展开导航"}
          </button>
        </div>
      </div>
      {mobileOpen ? (
        <nav
          id="mobile-main-nav"
          className="border-t border-slate-100 px-4 py-3 lg:hidden dark:border-slate-800"
        >
          <div className="grid gap-2 sm:grid-cols-2">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="inline-flex min-h-11 items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </nav>
      ) : null}
    </header>
  );
}
