"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { withClientBasePath } from "@/lib/client-url";
import { parseDemoRole } from "@/lib/approval";
import { parseZtUserRole } from "@/lib/zt-ranks";

export const DEMO_ROLE_STORAGE_KEY = "profit_demo_role";

/** 与导航 / 工作台联动 */
export const DEMO_ROLE_CHANGE_EVENT = "profit-demo-role-change";

export const ROLE_OPTIONS = [
  { value: "SALES_MANAGER", label: "销售经理" },
  { value: "SALES_DIRECTOR", label: "销售总监" },
  { value: "SALES_VP", label: "销售副总裁" },
  { value: "GM", label: "总经理" },
  { value: "ADMIN", label: "管理员" },
  { value: "SOLDIER", label: "战士（智探007）" },
  { value: "SQUAD_LEADER", label: "班长（智探007）" },
  { value: "PLATOON_LEADER", label: "排长（智探007）" },
  { value: "COMPANY_COMMANDER", label: "连长（智探007）" },
  { value: "DIVISION_COMMANDER", label: "师长（智探007）" },
  { value: "CORPS_COMMANDER", label: "军长（智探007）" },
  { value: "COMMANDER", label: "司令（智探007）" },
  { value: "GENERAL", label: "将军（智探007）" },
  { value: "SUPERADMIN", label: "超超级管理员（智探007）" },
] as const;

export const PROFIT_ROLE_OPTIONS = ROLE_OPTIONS.filter((x) =>
  ["SALES_MANAGER", "SALES_DIRECTOR", "SALES_VP", "GM", "ADMIN"].includes(
    x.value,
  ),
);

export const ZT_ROLE_OPTIONS = ROLE_OPTIONS.filter((x) =>
  [
    "SOLDIER",
    "ADMIN",
    "SQUAD_LEADER",
    "PLATOON_LEADER",
    "COMPANY_COMMANDER",
    "DIVISION_COMMANDER",
    "CORPS_COMMANDER",
    "COMMANDER",
    "GENERAL",
    "SUPERADMIN",
  ].includes(x.value),
);

/** 与 .env 中 NEXT_PUBLIC_PROFIT_AUTH_MODE=session 一致 */
export function isClientSessionAuth(): boolean {
  return process.env.NEXT_PUBLIC_PROFIT_AUTH_MODE === "session";
}

const ROLE_LABEL: Record<string, string> = {
  SALES_MANAGER: "销售经理",
  SALES_DIRECTOR: "销售总监",
  SALES_VP: "销售副总裁",
  GM: "总经理",
  ADMIN: "管理员",
  SOLDIER: "战士",
  SQUAD_LEADER: "班长",
  PLATOON_LEADER: "排长",
  COMPANY_COMMANDER: "连长",
  DIVISION_COMMANDER: "师长",
  CORPS_COMMANDER: "军长",
  COMMANDER: "司令",
  GENERAL: "将军",
  SUPERADMIN: "超超级管理员",
};

export function getDemoRole(): string {
  if (typeof window === "undefined") return "SALES_DIRECTOR";
  return sessionStorage.getItem(DEMO_ROLE_STORAGE_KEY) ?? "SALES_DIRECTOR";
}

export function demoHeaders(): HeadersInit {
  if (isClientSessionAuth()) {
    return {};
  }
  return { "x-demo-role": getDemoRole() };
}

export function useDemoRole(): string {
  const sessionMode = isClientSessionAuth();
  const [role, setRole] = useState<string>(() => {
    if (typeof window === "undefined") return "SALES_DIRECTOR";
    if (sessionMode) return "SALES_DIRECTOR";
    return getDemoRole();
  });

  useEffect(() => {
    if (sessionMode) {
      let cancelled = false;
      (async () => {
        try {
          const r = await fetch(withClientBasePath("/api/auth/session"), {
            credentials: "include",
          });
          const j = (await r.json()) as { user?: { role?: string } | null };
          if (!cancelled && j.user?.role) setRole(j.user.role);
        } catch {
          /* ignore */
        }
      })();
      return () => {
        cancelled = true;
      };
    }

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
  }, [sessionMode]);

  return role;
}

export function RoleSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const role = useDemoRole();
  const sessionMode = isClientSessionAuth();
  const isZtContext =
    pathname.startsWith("/zt007") ||
    pathname.startsWith("/personal") ||
    pathname.startsWith("/console/system") ||
    pathname.startsWith("/console/users") ||
    pathname.startsWith("/console/zt-system") ||
    pathname.startsWith("/console/zt-users") ||
    pathname.startsWith("/console/system") ||
    pathname.startsWith("/console/users") ||
    pathname.startsWith("/console/zt-system") ||
    pathname.startsWith("/console/zt-users");
  const visibleOptions = isZtContext ? ZT_ROLE_OPTIONS : PROFIT_ROLE_OPTIONS;
  const [sessionInfo, setSessionInfo] = useState<
    | { status: "loading" }
    | { status: "anon" }
    | {
        status: "in";
        email: string;
        role: string;
        ztRole?: string;
        isSuperAdmin?: boolean;
      }
  >(() => (sessionMode ? { status: "loading" } : { status: "anon" }));

  useEffect(() => {
    if (!sessionMode) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(withClientBasePath("/api/auth/session"), {
          credentials: "include",
        });
        const j = (await r.json()) as {
          user?: {
            email?: string;
            role?: string;
            ztRole?: string;
            isSuperAdmin?: boolean;
          } | null;
        };
        if (cancelled) return;
        if (j.user?.email) {
          setSessionInfo({
            status: "in",
            email: j.user.email,
            role: j.user.role ?? "SALES_DIRECTOR",
            ztRole: j.user.ztRole,
            isSuperAdmin: j.user.isSuperAdmin,
          });
        } else {
          setSessionInfo({ status: "anon" });
        }
      } catch {
        if (!cancelled) setSessionInfo({ status: "anon" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionMode]);

  const setRoleStore = useCallback((v: string) => {
    sessionStorage.setItem(DEMO_ROLE_STORAGE_KEY, v);
    window.dispatchEvent(
      new CustomEvent(DEMO_ROLE_CHANGE_EVENT, { detail: { role: v } }),
    );
  }, []);

  async function logout() {
    await fetch(withClientBasePath("/api/auth/logout"), {
      method: "POST",
      credentials: "include",
    });
    router.replace(withClientBasePath("/login"));
    router.refresh();
  }

  if (sessionMode) {
    const profitRoleLabel =
      ROLE_LABEL[parseDemoRole(sessionInfo.status === "in" ? sessionInfo.role : role)];
    const ztRoleValue =
      sessionInfo.status === "in"
        ? parseZtUserRole(sessionInfo.ztRole ?? sessionInfo.role)
        : parseZtUserRole(role);
    const ztRoleLabel = ROLE_LABEL[ztRoleValue] ?? ztRoleValue;
    const label =
      isZtContext ? ztRoleLabel : (profitRoleLabel ?? parseDemoRole(role));
    const ztLabel =
      isZtContext && sessionInfo.status === "in" && sessionInfo.ztRole
        ? sessionInfo.isSuperAdmin
          ? "超超级管理员"
          : (ROLE_LABEL[parseZtUserRole(sessionInfo.ztRole)] ??
            parseZtUserRole(sessionInfo.ztRole))
        : null;
    if (sessionInfo.status === "loading") {
      return (
        <span className="text-[11px] text-slate-500 dark:text-slate-400">会话…</span>
      );
    }
    if (sessionInfo.status === "anon") {
      return (
        <div className="flex flex-col items-end gap-0.5 sm:flex-row sm:items-center sm:gap-2">
          <Link
            href="/login"
            className="rounded-lg border border-slate-200 bg-slate-50/90 px-2.5 py-1.5 text-xs font-semibold text-slate-800 shadow-sm dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100"
          >
            登录
          </Link>
          <span className="hidden max-w-[14rem] text-[10px] leading-snug text-slate-500 lg:inline dark:text-slate-500">
            正式环境须登录后使用系统能力
          </span>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-end gap-0.5 sm:flex-row sm:items-center sm:gap-2">
        <div className="flex max-w-[18rem] flex-col items-end gap-1 rounded-lg border border-slate-200 bg-slate-50/90 px-2 py-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-900/80 sm:flex-row sm:items-center">
          <span className="truncate text-[11px] font-medium text-slate-700 dark:text-slate-200">
            {sessionInfo.email} · {label}
            {ztLabel ? ` · 智探007:${ztLabel}` : ""}
          </span>
          <button
            type="button"
            onClick={() => void logout()}
            className="shrink-0 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            退出
          </button>
        </div>
        <span className="hidden max-w-[14rem] text-[10px] leading-snug text-slate-500 lg:inline dark:text-slate-500">
          角色由账号决定；API 不再接受浏览器伪造身份头
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-0.5 sm:flex-row sm:items-center sm:gap-2">
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/90 px-2 py-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
        <span className="hidden text-[11px] font-medium text-slate-600 sm:inline dark:text-slate-400">
          试点角色
        </span>
        <select
          className="max-w-[7.5rem] cursor-pointer border-0 bg-transparent text-xs font-medium text-slate-800 focus:ring-0 dark:text-slate-200 sm:max-w-none"
          value={
            visibleOptions.some((x) => x.value === role)
              ? role
              : visibleOptions[0].value
          }
          aria-label="试点角色（演示模式）"
          onChange={(e) => {
            const v = e.target.value;
            setRoleStore(v);
          }}
        >
          {visibleOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <span className="hidden max-w-[14rem] text-[10px] leading-snug text-slate-500 lg:inline dark:text-slate-500">
        演示模式：菜单、审批与助手随所选角色更新
      </span>
    </div>
  );
}
