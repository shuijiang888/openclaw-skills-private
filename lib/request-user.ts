import type { PrismaClient, User } from "@prisma/client";
import { parseDemoRole, type DemoRole } from "@/lib/approval";
import { deriveActorRoleForZt } from "@/lib/zt-points";
import { parseZtUserRole, type ZtUserRole } from "@/lib/zt-ranks";

export type RequestUserContext = {
  demoRole: DemoRole;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  ztRole: ZtUserRole;
  isSuperAdmin: boolean;
  isAdminLike: boolean;
  isZtManager: boolean;
  mustChangePassword: boolean;
};

function isTruthyFlag(value: string | null): boolean {
  const v = (value ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

export function getRequestUserContext(req: Request): RequestUserContext {
  const demoRole = parseDemoRole(
    req.headers.get("x-profit-session-role") ?? req.headers.get("x-demo-role"),
  );
  const ztRole = parseZtUserRole(
    req.headers.get("x-profit-session-zt-role") ??
      deriveActorRoleForZt(demoRole) ??
      "SOLDIER",
  );
  const isSuperAdmin =
    ztRole === "SUPERADMIN" || isTruthyFlag(req.headers.get("x-profit-session-superadmin"));
  const isAdminLike = isSuperAdmin || ztRole === "ADMIN";
  const isZtManager = isAdminLike || ztRole === "GENERAL";
  const mustChangePassword = isTruthyFlag(
    req.headers.get("x-profit-session-must-change-password"),
  );

  return {
    demoRole,
    userId: req.headers.get("x-profit-session-user-id"),
    userEmail: req.headers.get("x-profit-session-email"),
    userName: req.headers.get("x-profit-session-name"),
    ztRole,
    isSuperAdmin,
    isAdminLike,
    isZtManager,
    mustChangePassword,
  };
}

export async function loadRequestUser(
  req: Request,
  prisma: PrismaClient,
): Promise<User | null> {
  const ctx = getRequestUserContext(req);
  if (!ctx.userId) return null;
  return prisma.user.findUnique({ where: { id: ctx.userId } });
}

