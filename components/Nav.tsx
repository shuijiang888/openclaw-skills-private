"use client";

import Link from "next/link";
import { useState } from "react";
import { BrandMark } from "./BrandMark";
import { FxiaokeBrandBadge } from "./FxiaokeBrandBadge";
import { RoleSwitcher, useDemoRole } from "./RoleSwitcher";
import { filterNavLinksForRole } from "@/lib/demo-role-modules";
import { parseDemoRole } from "@/lib/approval";

export function Nav() {
  const role = parseDemoRole(useDemoRole());
  const links = filterNavLinksForRole(role);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/90 bg-white/90 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/90">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3 sm:gap-5 lg:gap-8">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <Link href="/" className="flex min-w-0 items-center gap-2 sm:gap-3">
              <BrandMark />
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold tracking-tight text-slate-900 dark:text-white">
                  智能盈利管理系统
                </div>
                <div className="hidden truncate text-[11px] font-medium tracking-wide text-amber-800/90 sm:block dark:text-amber-400/90">
                  报价 · 审批 · 盈利结构
                </div>
              </div>
            </Link>
            <div className="hidden h-9 w-px shrink-0 bg-slate-200 md:block dark:bg-slate-700" aria-hidden />
            <div className="hidden min-w-0 flex-col gap-1 md:flex">
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">联合呈现</span>
              <FxiaokeBrandBadge variant="compact" />
            </div>
          </div>
          <nav className="hidden flex-wrap gap-0.5 text-[13px] font-medium text-slate-600 lg:flex dark:text-slate-400">
            {links.map((l) => (
              <Link key={l.href} href={l.href}
                className="rounded-lg px-3 py-1.5 transition hover:bg-amber-50 hover:text-amber-900 dark:hover:bg-amber-950/30 dark:hover:text-amber-300">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/dashboard"
            className="hidden rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-amber-500/20 transition hover:from-amber-600 hover:to-amber-700 sm:inline-flex">
            进入系统
          </Link>
          <RoleSwitcher />
          {/* 汉堡菜单按钮 - 仅移动端 */}
          <button type="button" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 lg:hidden dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            aria-label="菜单">
            {mobileMenuOpen ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
            )}
          </button>
        </div>
      </div>
      {/* 移动端折叠菜单 */}
      {mobileMenuOpen && (
        <nav className="border-t border-slate-100 bg-white/95 px-4 py-3 backdrop-blur lg:hidden dark:border-slate-800 dark:bg-slate-950/95">
          <div className="flex flex-col gap-1">
            {links.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-amber-50 hover:text-amber-900 dark:text-slate-300 dark:hover:bg-amber-950/30">
                {l.label}
              </Link>
            ))}
            <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}
              className="mt-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2.5 text-center text-sm font-bold text-white shadow sm:hidden">
              进入系统
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
