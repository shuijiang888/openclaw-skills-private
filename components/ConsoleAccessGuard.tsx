"use client";

import { useDemoRole } from "@/components/RoleSwitcher";
import {
  canAccessConsole,
  canAccessConsoleAgentAudit,
  canAccessConsoleRules,
  canViewConsoleCustomers,
} from "@/lib/demo-role-modules";
import { canViewSeedPilot } from "@/lib/seed-pilot-permissions";
import { parseDemoRole } from "@/lib/approval";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export function ConsoleAccessGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const role = parseDemoRole(useDemoRole());
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!canAccessConsole(role)) {
      router.replace("/dashboard?demo=forbidden-console");
      return;
    }
    if (
      pathname.startsWith("/console/customers") &&
      !canViewConsoleCustomers(role)
    ) {
      router.replace("/console");
      return;
    }
    if (pathname.startsWith("/console/rules") && !canAccessConsoleRules(role)) {
      router.replace("/console");
      return;
    }
    if (
      pathname.startsWith("/console/agent-audit") &&
      !canAccessConsoleAgentAudit(role)
    ) {
      router.replace("/console");
      return;
    }
    if (
      pathname.startsWith("/console/seed-pilot") &&
      !canViewSeedPilot(role)
    ) {
      router.replace("/console");
    }
  }, [role, pathname, router]);

  if (!canAccessConsole(role)) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
        当前账号/角色不包含「管理后台」权限，正在跳转到工作台…
        <p className="mt-2 text-xs opacity-90">
          切换为「销售经理」或「VP」后可使用后台；SDR/AE/售前请用工作台与商机报价。
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
