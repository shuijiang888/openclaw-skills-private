import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canPerformAction, type RbacRole } from "@/lib/rbac";
import { demoRoleFromRequest } from "@/lib/http";
import { isSessionAuthMode } from "@/lib/auth-mode";
import { parseDemoRole } from "@/lib/approval";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

function requestRbacRole(req: Request): RbacRole {
  if (isSessionAuthMode()) {
    const role = parseDemoRole(req.headers.get("x-profit-session-role"));
    return role === "ADMIN" ? "ADMIN" : role;
  }
  const role = demoRoleFromRequest(req);
  return role === "ADMIN" ? "ADMIN" : role;
}

export async function GET(req: Request) {
  const role = requestRbacRole(req);
  if (!canPerformAction(role, "user:manage")) {
    return NextResponse.json({ error: "无权限访问用户管理" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      teamId: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const teams = await prisma.team.findMany({
    select: { id: true, name: true, managerId: true },
  });

  return NextResponse.json({ users, teams });
}

export async function POST(req: Request) {
  const role = requestRbacRole(req);
  if (!canPerformAction(role, "user:manage")) {
    return NextResponse.json({ error: "无权限创建用户" }, { status: 403 });
  }

  const body = (await req.json()) as {
    email?: string;
    name?: string;
    password?: string;
    role?: string;
    teamId?: string | null;
  };

  if (!body.email?.trim() || !body.password?.trim()) {
    return NextResponse.json({ error: "邮箱和密码必填" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email: body.email.trim() } });
  if (existing) {
    return NextResponse.json({ error: "邮箱已存在" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(body.password.trim(), 10);

  const user = await prisma.user.create({
    data: {
      email: body.email.trim(),
      name: body.name?.trim() ?? "",
      passwordHash,
      role: body.role ?? "SALES_MANAGER",
      teamId: body.teamId ?? null,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      teamId: true,
      createdAt: true,
    },
  });

  return NextResponse.json(user);
}
