export type DemoRole =
  | "SDR"
  | "AE"
  | "PRE_SALES"
  | "SALES_MANAGER"
  | "VP";

const ROLE_ORDER: Record<DemoRole, number> = {
  SDR: 1,
  AE: 2,
  PRE_SALES: 2,
  SALES_MANAGER: 3,
  VP: 4,
};

export function requiredRoleForDiscount(discountRatio: number): {
  role: DemoRole;
  label: string;
} {
  const d = discountRatio * 100;
  if (d <= 5) return { role: "SDR", label: "Deal Desk：SDR（≤5% 折扣）" };
  if (d <= 12) return { role: "AE", label: "Deal Desk：AE（>5%–12%）" };
  if (d <= 20)
    return { role: "SALES_MANAGER", label: "Deal Desk：销售经理（>12%–20%）" };
  return { role: "VP", label: "Deal Desk：VP（>20% 或特批）" };
}

export function canApprove(
  actor: DemoRole,
  required: DemoRole,
): boolean {
  return ROLE_ORDER[actor] >= ROLE_ORDER[required];
}

/**
 * 将请求头中的角色解析为枚举（演示模式：x-demo-role；登录模式：x-profit-session-role）。
 * 未知或伪造值回落到「AE」，与前台 RoleSwitcher 默认一致。
 */
export function parseDemoRole(
  raw: string | null | undefined,
): DemoRole {
  const r = (raw ?? "").trim().toUpperCase();
  if (r === "SDR") return "SDR";
  if (r === "AE") return "AE";
  if (r === "PRE_SALES" || r === "SE" || r === "PRESALES") return "PRE_SALES";
  if (r === "SALES_MANAGER" || r === "MANAGER") return "SALES_MANAGER";
  if (r === "VP" || r === "SALES_VP") return "VP";
  // Backward-compatible aliases for legacy demo data.
  if (r === "SALES_DIRECTOR" || r === "DIRECTOR") return "AE";
  if (r === "GM" || r === "GENERAL_MANAGER" || r === "ADMIN" || r === "SYSTEM")
    return "VP";
  return "AE";
}
