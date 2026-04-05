import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getRequestUserContext } from "@/lib/request-user";
import { parseZtUserRole } from "@/lib/zt-ranks";
import { getZtSystemConfig } from "@/lib/zt-system-config";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const ctx = getRequestUserContext(req);
  if (!ctx.isAdminLike) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const rows = await prisma.user.findMany({
    orderBy: [{ isSuperAdmin: "desc" }, { createdAt: "desc" }],
    include: {
      orgUnit: {
        select: { id: true, name: true, code: true },
      },
      ztPointWallet: {
        select: { points: true, lifetimePoints: true, rank: true },
      },
    },
  });
  return NextResponse.json({
    items: rows.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      mobile: u.mobile,
      isActive: u.isActive,
      isSuperAdmin: u.isSuperAdmin,
      ztAllowInteractiveLlm: u.ztAllowInteractiveLlm,
      orgUnit: u.orgUnit,
      wallet: u.ztPointWallet,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    })),
  });
}

export async function POST(req: Request) {
  const ctx = getRequestUserContext(req);
  if (!ctx.isAdminLike) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = (await req.json().catch(() => null)) as
    | {
        email?: string;
        name?: string;
        password?: string;
        role?: string;
        mobile?: string;
        orgUnitId?: string | null;
      }
    | null;
  const email = String(body?.email ?? "")
    .trim()
    .toLowerCase();
  const password = String(body?.password ?? "");
  if (!email || !email.includes("@") || password.length < 6) {
    return NextResponse.json(
      { error: "email/password invalid (密码至少6位)" },
      { status: 400 },
    );
  }
  const ztRole = parseZtUserRole(body?.role);
  if (ztRole === "SUPERADMIN" && !ctx.isSuperAdmin) {
    return NextResponse.json(
      { error: "only superadmin can create superadmin user" },
      { status: 403 },
    );
  }
  const hash = await bcrypt.hash(password, 10);
  const row = await prisma.user.create({
    data: {
      email,
      name: String(body?.name ?? "").trim(),
      passwordHash: hash,
      role: ztRole,
      mobile: String(body?.mobile ?? "").trim(),
      isActive: true,
      isSuperAdmin: ztRole === "SUPERADMIN",
      orgUnitId: body?.orgUnitId ?? null,
    },
    include: {
      orgUnit: { select: { id: true, name: true, code: true } },
      ztPointWallet: { select: { points: true, lifetimePoints: true, rank: true } },
    },
  });
  return NextResponse.json({
    ok: true,
    item: {
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role,
      mobile: row.mobile,
      isActive: row.isActive,
      isSuperAdmin: row.isSuperAdmin,
      ztAllowInteractiveLlm: row.ztAllowInteractiveLlm,
      orgUnit: row.orgUnit,
      wallet: row.ztPointWallet,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    },
  });
}

export async function PATCH(req: Request) {
  const ctx = getRequestUserContext(req);
  if (!ctx.isAdminLike) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const config = await getZtSystemConfig();
  const body = (await req.json().catch(() => null)) as
    | {
        userId?: string;
        role?: string;
        name?: string;
        isActive?: boolean;
        isSuperAdmin?: boolean;
        ztAllowInteractiveLlm?: boolean;
        orgUnitId?: string | null;
      }
    | null;
  if (!body?.userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }
  if (body.isSuperAdmin === true && !ctx.isSuperAdmin) {
    return NextResponse.json(
      { error: "only superadmin can grant superadmin" },
      { status: 403 },
    );
  }
  const role = body.role?.trim();
  const data: {
    role?: string;
    name?: string;
    isActive?: boolean;
    isSuperAdmin?: boolean;
    ztAllowInteractiveLlm?: boolean;
    orgUnitId?: string | null;
  } = {};
  if (typeof role === "string" && role.length > 0) {
    const ztRole = parseZtUserRole(role);
    if (ztRole === "SUPERADMIN" && !ctx.isSuperAdmin) {
      return NextResponse.json(
        { error: "only superadmin can grant superadmin role" },
        { status: 403 },
      );
    }
    data.role = ztRole;
    if (ctx.isSuperAdmin) {
      data.isSuperAdmin = ztRole === "SUPERADMIN";
    }
  }
  if (typeof body.name === "string") data.name = body.name.trim();
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;
  if (typeof body.ztAllowInteractiveLlm === "boolean") {
    if (!config.llmInteractiveEnabled && body.ztAllowInteractiveLlm) {
      return NextResponse.json(
        { error: "system setting currently disables interactive LLM" },
        { status: 400 },
      );
    }
    data.ztAllowInteractiveLlm = body.ztAllowInteractiveLlm;
  }
  if (typeof body.isSuperAdmin === "boolean" && ctx.isSuperAdmin) {
    data.isSuperAdmin = body.isSuperAdmin;
  }
  if (body.orgUnitId === null || typeof body.orgUnitId === "string") {
    data.orgUnitId = body.orgUnitId;
  }
  const updated = await prisma.user.update({
    where: { id: body.userId },
    data,
    include: {
      orgUnit: { select: { id: true, name: true, code: true } },
      ztPointWallet: { select: { points: true, lifetimePoints: true, rank: true } },
    },
  });
  return NextResponse.json({
    ok: true,
    item: {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role,
      isActive: updated.isActive,
      isSuperAdmin: updated.isSuperAdmin,
      ztAllowInteractiveLlm: updated.ztAllowInteractiveLlm,
      orgUnit: updated.orgUnit,
      wallet: updated.ztPointWallet,
    },
  });
}
