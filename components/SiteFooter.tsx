"use client";

import Link from "next/link";
import { useDemoRole } from "@/components/RoleSwitcher";
import { parseDemoRole, type DemoRole } from "@/lib/approval";
import { canAccessConsole } from "@/lib/demo-role-modules";
import { APP_VERSION } from "@/lib/app-release";
import { usePathname } from "next/navigation";
import { isZtPath, normalizeNavPath } from "@/lib/nav-path";

function roleMaySeeStrategy(role: DemoRole): boolean {
  return role !== "SALES_MANAGER";
}

export function SiteFooter() {
  const role = parseDemoRole(useDemoRole());
  const rawPathname = usePathname();
  const pathname = normalizeNavPath(rawPathname ?? "/");
  const isZtContext = isZtPath(rawPathname);
  const isPortalPage = pathname === "/";

  return (
    <footer className="mt-auto border-t border-slate-200/80 bg-white/75 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/75">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
            {isPortalPage
              ? "AI价值服务作战平台 · 公共门户"
              : isZtContext
                ? "智探007 作战协同系统"
                : "智能盈利管理系统"}
          </p>
          <p className="mt-1 max-w-md text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            {isPortalPage
              ? "统一门户用于进入多系统模块与共享能力页面，按角色展示可访问入口，避免系统信息混淆。"
              : isZtContext
              ? "面向组织协同的情报、行动、积分与治理系统（产品试点版）。可独立运行，也可后续对接外部CRM。"
              : "面向制造与科技型企业的报价、审批与盈利结构管理（产品试点版）。生产落地需结合贵司主数据、核算口径与组织授权进行配置。"}
          </p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
          {isPortalPage ? (
            <>
              <Link
                href="/"
                className="hover:text-cyan-700 dark:hover:text-cyan-400"
              >
                门户
              </Link>
              <Link
                href="/dashboard"
                className="hover:text-cyan-700 dark:hover:text-cyan-400"
              >
                工作台
              </Link>
              <Link
                href="/health-check"
                className="hover:text-cyan-700 dark:hover:text-cyan-400"
              >
                健康检查
              </Link>
              <Link
                href="/zt007"
                className="hover:text-cyan-700 dark:hover:text-cyan-400"
              >
                智探007
              </Link>
            </>
          ) : null}
          {isZtContext ? (
            <>
              <Link
                href="/zt007"
                className="hover:text-cyan-700 dark:hover:text-cyan-400"
              >
                智探007总览
              </Link>
              <Link
                href="/zt007/action"
                className="hover:text-cyan-700 dark:hover:text-cyan-400"
              >
                行动中心
              </Link>
              <Link
                href="/zt007/bounty"
                className="hover:text-cyan-700 dark:hover:text-cyan-400"
              >
                悬赏任务
              </Link>
              <Link
                href="/zt007/honor"
                className="hover:text-cyan-700 dark:hover:text-cyan-400"
              >
                荣誉积分
              </Link>
              <Link
                href="/personal"
                className="hover:text-cyan-700 dark:hover:text-cyan-400"
              >
                我的战情台
              </Link>
              <Link
                href="/health-check"
                className="hover:text-cyan-700 dark:hover:text-cyan-400"
              >
                健康检查
              </Link>
            </>
          ) : null}
          {!isZtContext && !isPortalPage && roleMaySeeStrategy(role) ? (
            <Link
              href="/strategy"
              className="hover:text-amber-700 dark:hover:text-amber-400"
            >
              战略全文
            </Link>
          ) : null}
          {!isZtContext && !isPortalPage && roleMaySeeStrategy(role) ? (
            <Link
              href="/roadmap"
              className="hover:text-amber-700 dark:hover:text-amber-400"
            >
              产品路线
            </Link>
          ) : null}
          {!isZtContext && !isPortalPage && canAccessConsole(role) ? (
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
        v{APP_VERSION} · 产品试点版 · 数据以库内为准 · 不构成法定报价或审计依据
      </div>
    </footer>
  );
}
