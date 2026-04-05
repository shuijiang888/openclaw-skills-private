import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequestUserContext } from "@/lib/request-user";
import {
  mapIntelDefinitionRow,
  normalizeIntelPatch,
} from "@/lib/zt-intel-definitions";
import { ensureZtBootstrap } from "@/lib/zt-bootstrap";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  await ensureZtBootstrap();
  const ctx = getRequestUserContext(req);
  if (!ctx.isAdminLike) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const rows = await prisma.ztIntelDefinition.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json({ items: rows.map(mapIntelDefinitionRow) });
}

export async function POST(req: Request) {
  await ensureZtBootstrap();
  const ctx = getRequestUserContext(req);
  if (!ctx.isAdminLike) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const patch = normalizeIntelPatch(body);
  if (!patch.code || !patch.name) {
    return NextResponse.json(
      { error: "code/name required" },
      { status: 400 },
    );
  }

  const created = await prisma.ztIntelDefinition.create({
    data: {
      code: patch.code,
      name: patch.name,
      category: patch.category ?? "MARKET",
      description: patch.description ?? "",
      requiredFieldsJson: patch.requiredFieldsJson ?? "[]",
      allowedSignalTypesJson:
        patch.allowedSignalTypesJson ?? '["strategic","tactical","knowledge"]',
      allowedFormatsJson:
        patch.allowedFormatsJson ?? '["text","image","video","voice","link"]',
      taskTemplateHint: patch.taskTemplateHint ?? "",
      defaultRewardPoints: patch.defaultRewardPoints ?? 8,
      isActive: patch.isActive ?? true,
      sortOrder: patch.sortOrder ?? 100,
    },
  });
  return NextResponse.json({ ok: true, item: mapIntelDefinitionRow(created) });
}

export async function PATCH(req: Request) {
  await ensureZtBootstrap();
  const ctx = getRequestUserContext(req);
  if (!ctx.isAdminLike) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const id = String(body.id ?? "").trim();
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  const patch = normalizeIntelPatch(body);
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "empty patch" }, { status: 400 });
  }

  const updated = await prisma.ztIntelDefinition.update({
    where: { id },
    data: patch,
  });
  return NextResponse.json({ ok: true, item: mapIntelDefinitionRow(updated) });
}

