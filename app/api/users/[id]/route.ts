import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canPerformAction, type RbacRole } from "@/lib/rbac";
import { demoRoleFromRequest } from "@/lib/http";
import bcrypt from "bcryptjs";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const role = (demoRoleFromRequest(req) ?? "SALES_DIRECTOR") as RbacRole;
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

  return NextResponse.json(user);
}

export async function DELETE(req: Request, { params }: Params) {
  const role = (demoRoleFromRequest(req) ?? "SALES_DIRECTOR") as RbacRole;
  if (!canPerformAction(role, "user:manage")) {
    return NextResponse.json({ error: "无权限删除用户" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
