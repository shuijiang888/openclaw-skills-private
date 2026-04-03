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

export function parseDemoRole(
  raw: string | null | undefined,
): DemoRole {
  const r = (raw ?? "SALES_MANAGER").toUpperCase();
  if (r === "SALES_MANAGER" || r === "MANAGER") return "SALES_MANAGER";
  if (r === "SALES_DIRECTOR" || r === "DIRECTOR") return "SALES_DIRECTOR";
  if (r === "SALES_VP" || r === "VP") return "SALES_VP";
  if (r === "GM" || r === "GENERAL_MANAGER") return "GM";
  return "ADMIN";
}
