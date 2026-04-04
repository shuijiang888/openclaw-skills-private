export type DemoRole =
  | "SALES_MANAGER"
  | "SALES_DIRECTOR"
  | "SALES_VP"
  | "GM"
  | "ADMIN";

const ROLE_ORDER: Record<DemoRole, number> = {
  SALES_MANAGER: 1,
  SALES_DIRECTOR: 2,
  SALES_VP: 3,
  GM: 4,
  ADMIN: 4,
};

export function requiredRoleForDiscount(discountRatio: number): {
  role: DemoRole;
  label: string;
} {
  const d = discountRatio * 100;
  if (d <= 5) return { role: "SALES_MANAGER", label: "销售经理（≤5% 折扣）" };
  if (d <= 15)
    return { role: "SALES_DIRECTOR", label: "销售总监（5%–15%）" };
  if (d <= 20) return { role: "SALES_VP", label: "销售副总裁（15%–20%）" };
  return { role: "GM", label: "总经理（>20% 或特批）" };
}

export function canApprove(
  actor: DemoRole,
  required: DemoRole,
): boolean {
  return ROLE_ORDER[actor] >= ROLE_ORDER[required];
}

/**
 * 将请求头中的角色解析为枚举（演示模式：x-demo-role；登录模式：x-profit-session-role）。
 * 未知或伪造值回落到「销售总监」，与前台 RoleSwitcher 默认一致，避免误放行为 ADMIN。
 */
export function parseDemoRole(
  raw: string | null | undefined,
): DemoRole {
  const r = (raw ?? "").trim().toUpperCase();
  if (r === "SUPERADMIN" || r === "SUPER_ADMIN") return "ADMIN";
  if (r === "SALES_MANAGER" || r === "MANAGER") return "SALES_MANAGER";
  if (r === "SALES_DIRECTOR" || r === "DIRECTOR") return "SALES_DIRECTOR";
  if (r === "SALES_VP" || r === "VP") return "SALES_VP";
  // 智探007 军衔角色映射到盈利系统最小业务权限，避免越权进入管理能力
  if (
    r === "GENERAL" ||
    r === "COMMANDER" ||
    r === "CORPS_COMMANDER" ||
    r === "DIVISION_COMMANDER" ||
    r === "COMPANY_COMMANDER" ||
    r === "PLATOON_LEADER" ||
    r === "SQUAD_LEADER" ||
    r === "SOLDIER"
  ) {
    return "SALES_MANAGER";
  }
  if (r === "GM" || r === "GENERAL_MANAGER") return "GM";
  if (r === "ADMIN" || r === "SYSTEM") return "ADMIN";
  return "SALES_DIRECTOR";
}
