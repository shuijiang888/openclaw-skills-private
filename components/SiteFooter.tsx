"use client";

import Link from "next/link";
import { FxiaokeBrandBadge } from "@/components/FxiaokeBrandBadge";
import { useDemoRole } from "@/components/RoleSwitcher";
import { parseDemoRole, type DemoRole } from "@/lib/approval";
import { canAccessConsole } from "@/lib/demo-role-modules";
import { APP_VERSION } from "@/lib/app-release";

function roleMaySeeStrategy(role: DemoRole): boolean {
  return role !== "SALES_MANAGER";
}

export function SiteFooter() {
  const role = parseDemoRole(useDemoRole());

  return (
    <footer className="mt-auto border-t border-slate-200/80 bg-white/60 backdrop-blur dark:border-slate-800 dark:bg-slate-950/60">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
            智能盈利管理系统
          </p>
          <p className="mt-1 max-w-md text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            面向制造与科技型企业的报价、审批与盈利结构管理演示环境。生产落地需结合贵司主数据、
            核算口径与组织授权进行配置。
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              品牌联合
            </span>
            <FxiaokeBrandBadge variant="footer" />
          </div>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
          {roleMaySeeStrategy(role) ? (
            <Link
              href="/strategy"
              className="hover:text-amber-700 dark:hover:text-amber-400"
            >
              战略全文
            </Link>
          ) : null}
          {roleMaySeeStrategy(role) ? (
            <Link
              href="/roadmap"
              className="hover:text-amber-700 dark:hover:text-amber-400"
            >
              产品路线
            </Link>
          ) : null}
          {canAccessConsole(role) ? (
            <Link
              href="/console/readiness"
              className="hover:text-amber-700 dark:hover:text-amber-400"
            >
              落地准备（后台）
            </Link>
          ) : null}
        </div>
      </div>
      <div className="border-t border-slate-100 py-3 text-center text-[11px] text-slate-400 dark:border-slate-800 dark:text-slate-500">
        v{APP_VERSION} · © 演示用途 · 数据均为样例 · 不构成报价或审计依据
      </div>
    </footer>
  );
}
