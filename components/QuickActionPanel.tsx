"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useDemoRole } from "@/components/RoleSwitcher";
import { parseDemoRole } from "@/lib/approval";

export function QuickActionPanel() {
  const role = parseDemoRole(useDemoRole());
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    void fetch("/api/projects")
      .then(r => r.json())
      .then((projects: { status: string }[]) => {
        setPendingCount(projects.filter(p => p.status === "PENDING_APPROVAL").length);
      })
      .catch(() => {});
  }, []);

  const actions = [
    { label: "新建报价", href: "/projects/new", icon: "➕", desc: "快速创建询价项目", color: "from-amber-500 to-amber-600" },
    { label: `待审批 (${pendingCount})`, href: "/projects?focus=my-queue", icon: "⏳", desc: "处理审批队列", color: "from-blue-500 to-blue-600" },
    { label: "盈利罗盘", href: "/compass", icon: "🧭", desc: "查看项目四象限", color: "from-emerald-500 to-emerald-600" },
    { label: "项目管理", href: "/projects", icon: "📋", desc: "管理所有项目", color: "from-violet-500 to-violet-600" },
  ];

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-r from-slate-50 to-amber-50/30 p-4 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:to-amber-950/10">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white">快捷操作</h2>
        <span className="text-[10px] text-slate-500">当前角色：{role === "ADMIN" ? "管理员" : role === "GM" ? "总经理" : role === "SALES_VP" ? "VP" : role === "SALES_DIRECTOR" ? "总监" : "经理"}</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {actions.map(a => (
          <Link key={a.label} href={a.href}
            className="card-hover flex flex-col items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-3 text-center shadow-sm transition hover:border-amber-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-900">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-lg text-white shadow" style={{ backgroundImage: `linear-gradient(135deg, var(--tw-gradient-from), var(--tw-gradient-to))` }}>
              <span className={`bg-gradient-to-br ${a.color} flex h-10 w-10 items-center justify-center rounded-xl text-lg text-white shadow`}>{a.icon}</span>
            </span>
            <span className="text-xs font-bold text-slate-900 dark:text-white">{a.label}</span>
            <span className="text-[9px] text-slate-500">{a.desc}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
