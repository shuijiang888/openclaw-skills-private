"use client";

import Link from "next/link";
import { useDemoRole } from "@/components/RoleSwitcher";
import { parseDemoRole } from "@/lib/approval";
import {
  canAccessConsole,
  filterNavLinksForRole,
} from "@/lib/demo-role-modules";
import { getRolePlaybook } from "@/lib/role-playbook";

export function RoleHomePanel() {
  const role = parseDemoRole(useDemoRole());
  const pb = getRolePlaybook(role);
  const links = filterNavLinksForRole(role);
  const topOps = links.filter((l) =>
    ["/projects", "/projects/new", "/compass", "/dashboard"].includes(l.href),
  );

  return (
    <section className="rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white via-slate-50/80 to-violet-50/40 p-5 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-violet-950/30">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-400">
            按身份 · 实战引导
          </p>
          <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
            {pb.label}：本档重点
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            {pb.dashboardIntro}
          </p>
        </div>
        <span className="rounded-lg border border-violet-200/80 bg-violet-50/90 px-2.5 py-1 text-[10px] font-semibold text-violet-900 dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-200">
          切换右上角身份可对比菜单与助手行为
        </span>
      </div>
      <ul className="mt-4 grid gap-2 sm:grid-cols-3">
        {pb.priorities.map((p) => (
          <li
            key={p.title}
            className="rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950/40"
          >
            <p className="text-xs font-semibold text-slate-900 dark:text-white">
              {p.title}
            </p>
            <p className="mt-1 text-[11px] leading-snug text-slate-600 dark:text-slate-400">
              {p.detail}
            </p>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-200/80 pt-4 dark:border-slate-700">
        <Link
          href="/projects?focus=my-queue"
          className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-500 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400"
        >
          待我审批队列 →
        </Link>
        {topOps.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 dark:bg-violet-600 dark:hover:bg-violet-500"
          >
            {l.label} →
          </Link>
        ))}
        {canAccessConsole(role) ? (
          <Link
            href="/console"
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            管理后台 →
          </Link>
        ) : null}
      </div>
    </section>
  );
}
