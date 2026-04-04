export const ZT_USER_ROLES = [
  "SUPERADMIN",
  "ADMIN",
  "GENERAL",
  "COMMANDER",
  "CORPS_COMMANDER",
  "DIVISION_COMMANDER",
  "COMPANY_COMMANDER",
  "PLATOON_LEADER",
  "SQUAD_LEADER",
  "SOLDIER",
] as const;

export type ZtUserRole = (typeof ZT_USER_ROLES)[number];

type RankDef = {
  role: ZtUserRole;
  label: string;
  minPoints: number;
  maxPoints: number | null;
};

/**
 * 积分军衔（不含 ADMIN/SUPERADMIN）：
 * SOLDIER -> SQUAD_LEADER -> PLATOON_LEADER -> COMPANY_COMMANDER ->
 * DIVISION_COMMANDER -> CORPS_COMMANDER -> COMMANDER -> GENERAL
 */
export const ZT_POINT_RANKS: RankDef[] = [
  { role: "SOLDIER", label: "战士", minPoints: 0, maxPoints: 199 },
  { role: "SQUAD_LEADER", label: "班长", minPoints: 200, maxPoints: 499 },
  { role: "PLATOON_LEADER", label: "排长", minPoints: 500, maxPoints: 999 },
  { role: "COMPANY_COMMANDER", label: "连长", minPoints: 1000, maxPoints: 1999 },
  { role: "DIVISION_COMMANDER", label: "师长", minPoints: 2000, maxPoints: 3999 },
  { role: "CORPS_COMMANDER", label: "军长", minPoints: 4000, maxPoints: 6999 },
  { role: "COMMANDER", label: "司令", minPoints: 7000, maxPoints: 10999 },
  { role: "GENERAL", label: "将军", minPoints: 11000, maxPoints: null },
];

export const ZT_ROLE_LABEL: Record<ZtUserRole, string> = {
  SUPERADMIN: "超超级管理员",
  ADMIN: "管理员",
  GENERAL: "将军",
  COMMANDER: "司令",
  CORPS_COMMANDER: "军长",
  DIVISION_COMMANDER: "师长",
  COMPANY_COMMANDER: "连长",
  PLATOON_LEADER: "排长",
  SQUAD_LEADER: "班长",
  SOLDIER: "战士",
};

export function parseZtUserRole(input: string | null | undefined): ZtUserRole {
  const v = (input ?? "").trim().toUpperCase();
  if (v === "SALES_MANAGER") return "SOLDIER";
  if (v === "SALES_DIRECTOR") return "PLATOON_LEADER";
  if (v === "SALES_VP") return "COMPANY_COMMANDER";
  if (v === "GM") return "GENERAL";
  if (v === "ADMIN") return "ADMIN";
  if ((ZT_USER_ROLES as readonly string[]).includes(v)) {
    return v as ZtUserRole;
  }
  return "SOLDIER";
}

export function isAdminLikeRole(role: ZtUserRole): boolean {
  return role === "ADMIN" || role === "SUPERADMIN";
}

export function rankByPoints(points: number): RankDef {
  const safePoints = Number.isFinite(points) ? Math.max(0, Math.floor(points)) : 0;
  for (let i = ZT_POINT_RANKS.length - 1; i >= 0; i -= 1) {
    const r = ZT_POINT_RANKS[i];
    if (safePoints >= r.minPoints) {
      return r;
    }
  }
  return ZT_POINT_RANKS[0];
}

export function nextRank(points: number): RankDef | null {
  const current = rankByPoints(points);
  const idx = ZT_POINT_RANKS.findIndex((x) => x.role === current.role);
  if (idx < 0 || idx >= ZT_POINT_RANKS.length - 1) return null;
  return ZT_POINT_RANKS[idx + 1];
}

export function rankOrderByLabel(label: string): number {
  const idx = ZT_POINT_RANKS.findIndex((x) => x.label === label);
  return idx >= 0 ? idx + 1 : 1;
}

export function legacyDemoRoleForZt(role: ZtUserRole): string {
  if (role === "SUPERADMIN" || role === "ADMIN") return "ADMIN";
  if (role === "GENERAL") return "GM";
  if (role === "COMPANY_COMMANDER") return "SALES_VP";
  if (
    role === "DIVISION_COMMANDER" ||
    role === "CORPS_COMMANDER" ||
    role === "COMMANDER"
  ) {
    return "SALES_VP";
  }
  if (role === "PLATOON_LEADER") return "SALES_DIRECTOR";
  if (role === "SQUAD_LEADER" || role === "SOLDIER") return "SALES_MANAGER";
  return "SALES_MANAGER";
}

export function actorRoleCandidatesForZt(role: ZtUserRole): string[] {
  const v = [role, legacyDemoRoleForZt(role)];
  return Array.from(new Set(v.filter(Boolean)));
}
