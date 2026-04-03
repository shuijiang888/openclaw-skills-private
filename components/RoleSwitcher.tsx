"use client";

import { useCallback, useEffect, useState } from "react";

export const DEMO_ROLE_STORAGE_KEY = "profit_demo_role";

/** 与导航 / 工作台联动 */
export const DEMO_ROLE_CHANGE_EVENT = "profit-demo-role-change";

export const ROLE_OPTIONS = [
  { value: "SALES_MANAGER", label: "销售经理" },
  { value: "SALES_DIRECTOR", label: "销售总监" },
  { value: "SALES_VP", label: "销售副总裁" },
  { value: "GM", label: "总经理" },
  { value: "ADMIN", label: "管理员" },
] as const;

export function getDemoRole(): string {
  if (typeof window === "undefined") return "SALES_DIRECTOR";
  return sessionStorage.getItem(DEMO_ROLE_STORAGE_KEY) ?? "SALES_DIRECTOR";
}

export function demoHeaders(): HeadersInit {
  return { "x-demo-role": getDemoRole() };
}

export function useDemoRole(): string {
  const [role, setRole] = useState<string>(() =>
    typeof window === "undefined" ? "SALES_DIRECTOR" : getDemoRole(),
  );

  useEffect(() => {
    const sync = () => setRole(getDemoRole());
    const onCustom = (e: Event) => {
      const ce = e as CustomEvent<{ role: string }>;
      if (typeof ce.detail?.role === "string") setRole(ce.detail.role);
    };
    window.addEventListener("storage", sync);
    window.addEventListener(DEMO_ROLE_CHANGE_EVENT, onCustom as EventListener);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(
        DEMO_ROLE_CHANGE_EVENT,
        onCustom as EventListener,
      );
    };
  }, []);

  return role;
}

export function RoleSwitcher() {
  const role = useDemoRole();
  const setRoleStore = useCallback((v: string) => {
    sessionStorage.setItem(DEMO_ROLE_STORAGE_KEY, v);
    window.dispatchEvent(
      new CustomEvent(DEMO_ROLE_CHANGE_EVENT, { detail: { role: v } }),
    );
  }, []);

  return (
    <div className="flex flex-col items-end gap-0.5 sm:flex-row sm:items-center sm:gap-2">
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/90 px-2 py-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
        <span className="hidden text-[11px] font-medium text-slate-600 sm:inline dark:text-slate-400">
          演示身份
        </span>
        <select
          className="max-w-[7.5rem] cursor-pointer border-0 bg-transparent text-xs font-medium text-slate-800 focus:ring-0 dark:text-slate-200 sm:max-w-none"
          value={role}
          aria-label="演示身份"
          onChange={(e) => {
            const v = e.target.value;
            setRoleStore(v);
          }}
        >
          {ROLE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <span className="hidden text-[10px] text-slate-500 lg:inline dark:text-slate-500">
        菜单与审批能力随身份更新
      </span>
    </div>
  );
}
