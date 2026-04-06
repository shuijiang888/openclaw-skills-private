import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canPerformAction, type RbacRole } from "@/lib/rbac";
import { demoRoleFromRequest, sessionUserIdFromRequest } from "@/lib/http";
import { isSessionAuthMode } from "@/lib/auth-mode";
import { parseDemoRole } from "@/lib/approval";
import bcrypt from "bcryptjs";

type Params = { params: Promise<{ id: string }> };

function requestRbacRole(req: Request): RbacRole {
  if (isSessionAuthMode()) {
    const raw = (req.headers.get("x-profit-session-role") ?? "")
      .trim()
      .toUpperCase();
    if (raw === "SUPER_ADMIN" || raw === "SUPERADMIN") return "SUPER_ADMIN";
    return parseDemoRole(raw);
  }
  return demoRoleFromRequest(req);
}

export async function PATCH(req: Request, { params }: Params) {
  const role = requestRbacRole(req);
  const actorId = sessionUserIdFromRequest(req) ?? "__demo__";
  if (!canPerformAction(role, "user:manage")) {
    return NextResponse.json({ error: "无权限修改用户" }, { status: 403 });
  }

  const { id } = await params;
  const body = (await req.json()) as {
    name?: string;
    role?: string;
    teamId?: string | null;
    password?: string;
  };

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name.trim();
  if (body.role !== undefined) data.role = body.role;
  if (body.teamId !== undefined) data.teamId = body.teamId;
  if (body.password?.trim()) {
    data.passwordHash = await bcrypt.hash(body.password.trim(), 10);
  }

  const before = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      teamId: true,
      updatedAt: true,
    },
  });
  if (!before) {
    return NextResponse.json({ error: "用户不存在" }, { status: 404 });
  }
  const user = await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      teamId: true,
      updatedAt: true,
    },
  });
  await prisma.agentAuditLog.create({
    data: {
      requestId: crypto.randomUUID(),
      route: "PATCH /api/users/[id]",
      action: "user_update",
      actorRole: role,
      actorId,
      reason: `修改用户 ${user.email}`,
      beforeJson: JSON.stringify(before),
      afterJson: JSON.stringify({
        id: user.id,
        name: user.name,
        role: user.role,
        teamId: user.teamId,
      }),
      metaJson: JSON.stringify({
        targetUserId: id,
        changedFields: Object.keys(data),
      }),
    },
  });

  return NextResponse.json(user);
}

export async function DELETE(req: Request, { params }: Params) {
  const role = requestRbacRole(req);
  const actorId = sessionUserIdFromRequest(req) ?? "__demo__";
  if (!canPerformAction(role, "user:manage")) {
    return NextResponse.json({ error: "无权限删除用户" }, { status: 403 });
  }

  const { id } = await params;
  const before = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      teamId: true,
      updatedAt: true,
    },
  });
  if (!before) {
    return NextResponse.json({ error: "用户不存在" }, { status: 404 });
  }

  await prisma.user.delete({ where: { id } });

  await prisma.agentAuditLog.create({
    data: {
      requestId: crypto.randomUUID(),
      route: "DELETE /api/users/[id]",
      action: "user_delete",
      actorRole: role,
      actorId,
      reason: `删除用户 ${before.email ?? id}`,
      beforeJson: JSON.stringify(before),
      afterJson: JSON.stringify({ id, deleted: true }),
      metaJson: JSON.stringify({ targetUserId: id }),
    },
  });
  return NextResponse.json({ ok: true });
}
