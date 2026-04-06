import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canPerformAction, type RbacRole } from "@/lib/rbac";
import { demoRoleFromRequest, sessionUserIdFromRequest } from "@/lib/http";
import bcrypt from "bcryptjs";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const role = (demoRoleFromRequest(req) ?? "SALES_DIRECTOR") as RbacRole;
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
      requestId: `users-patch-${id}-${Date.now()}`,
      route: "PATCH /api/users/[id]",
      action: "user_update",
      actorRole: role,
      actorId,
      reason: "",
      beforeJson: JSON.stringify(before),
      afterJson: JSON.stringify(user),
      metaJson: JSON.stringify({ targetUserId: id }),
    },
  });

  return NextResponse.json(user);
}

export async function DELETE(req: Request, { params }: Params) {
  const role = (demoRoleFromRequest(req) ?? "SALES_DIRECTOR") as RbacRole;
  const actorId = sessionUserIdFromRequest(req) ?? "__demo__";
  if (!canPerformAction(role, "user:manage")) {
    return NextResponse.json({ error: "无权限删除用户" }, { status: 403 });
  }
  if (role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "仅超级管理员可删除用户" }, { status: 403 });
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
      requestId: `users-delete-${id}-${Date.now()}`,
      route: "DELETE /api/users/[id]",
      action: "user_delete",
      actorRole: role,
      actorId,
      reason: "",
      beforeJson: JSON.stringify(before),
      afterJson: JSON.stringify({ id, deleted: true }),
      metaJson: JSON.stringify({ targetUserId: id }),
    },
  });
  return NextResponse.json({ ok: true });
}
