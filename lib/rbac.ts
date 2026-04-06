/**
 * RBAC 数据权限拦截 — 服务端 API 层使用
 * 红线①：权限只在后端生效，前端隐藏按钮不算
 * 红线②：API 层强制执行数据域隔离
 */

import { prisma } from "@/lib/prisma";

export type RbacRole = "SALES_MANAGER" | "SALES_DIRECTOR" | "SALES_VP" | "GM" | "ADMIN" | "SUPER_ADMIN";

export type DataScope = {
  mode: "own" | "team" | "all";
  ownerIds?: string[];
};

/**
 * 根据用户角色和 userId 计算数据可见范围
 * - SALES_MANAGER: 只看自己的 (ownerId = userId)
 * - SALES_DIRECTOR: 看团队的 (ownerId in teamMemberIds)
 * - SALES_VP / GM / ADMIN: 全量
 * - SUPER_ADMIN: 全量（穿透）
 *
 * 约束：Manager 默认只看自己，团队范围需显式配置。
 * 严禁：if (role === 'Manager' && teamId == null) return ALL
 */
export async function resolveDataScope(userId: string, role: RbacRole): Promise<DataScope> {
  if (role === "SUPER_ADMIN" || role === "ADMIN" || role === "GM" || role === "SALES_VP") {
    return { mode: "all" };
  }

  if (role === "SALES_DIRECTOR") {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { teamId: true },
    });

    if (!user?.teamId) {
      return { mode: "own", ownerIds: [userId] };
    }

    const teamMembers = await prisma.user.findMany({
      where: { teamId: user.teamId },
      select: { id: true },
    });

    return {
      mode: "team",
      ownerIds: teamMembers.map(m => m.id),
    };
  }

  return { mode: "own", ownerIds: [userId] };
}

/**
 * 将 DataScope 转换为 Prisma where 条件
 */
export function scopeToWhereClause(scope: DataScope): Record<string, unknown> {
  if (scope.mode === "all") return {};
  if (!scope.ownerIds || scope.ownerIds.length === 0) {
    return { ownerId: "__NO_ACCESS__" };
  }
  if (scope.ownerIds.length === 1) {
    return { ownerId: scope.ownerIds[0] };
  }
  return { ownerId: { in: scope.ownerIds } };
}

/**
 * 检查用户是否有权访问指定页面/功能
 */
export function canAccessRoute(role: RbacRole, route: string): boolean {
  const OPEN_ROUTES = ["/", "/about", "/dashboard", "/projects", "/compass", "/data-screen", "/login"];
  const DIRECTOR_PLUS = ["/roadmap", "/strategy"];
  const BACKOFFICE = ["/console"];
  const ADMIN_ONLY = ["/console/rules", "/console/agent-audit"];

  if (OPEN_ROUTES.some(r => route === r || route.startsWith(r + "/"))) return true;
  if (route.startsWith("/projects/")) return true;

  if (DIRECTOR_PLUS.some(r => route === r || route.startsWith(r + "/"))) {
    return role !== "SALES_MANAGER";
  }

  if (ADMIN_ONLY.some(r => route === r || route.startsWith(r + "/"))) {
    return role === "ADMIN" || role === "SUPER_ADMIN";
  }

  if (BACKOFFICE.some(r => route === r || route.startsWith(r + "/"))) {
    return role === "GM" || role === "ADMIN" || role === "SUPER_ADMIN";
  }

  return false;
}

/**
 * 检查用户是否有权执行指定操作
 */
export function canPerformAction(role: RbacRole, action: string): boolean {
  const ACTIONS: Record<string, RbacRole[]> = {
    "project:create": ["SALES_MANAGER", "SALES_DIRECTOR", "SALES_VP", "GM", "ADMIN", "SUPER_ADMIN"],
    "project:read": ["SALES_MANAGER", "SALES_DIRECTOR", "SALES_VP", "GM", "ADMIN", "SUPER_ADMIN"],
    "quote:submit": ["SALES_MANAGER", "SALES_DIRECTOR", "SALES_VP", "GM", "ADMIN", "SUPER_ADMIN"],
    "quote:approve:5pct": ["SALES_MANAGER", "SALES_DIRECTOR", "SALES_VP", "GM", "ADMIN", "SUPER_ADMIN"],
    "quote:approve:15pct": ["SALES_DIRECTOR", "SALES_VP", "GM", "ADMIN", "SUPER_ADMIN"],
    "quote:approve:20pct": ["SALES_VP", "GM", "ADMIN", "SUPER_ADMIN"],
    "quote:approve:unlimited": ["GM", "ADMIN", "SUPER_ADMIN"],
    "customer:read": ["GM", "ADMIN", "SUPER_ADMIN"],
    "customer:write": ["ADMIN", "SUPER_ADMIN"],
    "csv:import": ["ADMIN", "SUPER_ADMIN"],
    "rules:manage": ["ADMIN", "SUPER_ADMIN"],
    "audit:read": ["ADMIN", "SUPER_ADMIN"],
    "user:manage": ["ADMIN", "SUPER_ADMIN"],
    "superadmin:penetrate": ["SUPER_ADMIN"],
  };

  const allowed = ACTIONS[action];
  if (!allowed) return false;
  return allowed.includes(role);
}
