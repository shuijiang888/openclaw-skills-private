import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ztRoleFromRequest } from "@/lib/http";
import { getRequestUserContext } from "@/lib/request-user";
import { applyPointsAndSyncRank } from "@/lib/zt-points";
import { ensureZtBootstrap } from "@/lib/zt-bootstrap";
import { actorRoleCandidatesForZt } from "@/lib/zt-ranks";
import { pickRequiredFieldMisses } from "@/lib/zt-intel-definitions";

function sanitizeExtraFields(input: unknown): Record<string, string> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const normalized: Record<string, string> = {};
  for (const [rawKey, rawValue] of Object.entries(input)) {
    const key = String(rawKey ?? "")
      .trim()
      .replace(/[^A-Za-z0-9_]/g, "")
      .slice(0, 48);
    if (!key) continue;
    const value =
      typeof rawValue === "string"
        ? rawValue.trim()
        : String(rawValue ?? "").trim();
    if (!value) continue;
    normalized[key] = value.slice(0, 2000);
  }
  return normalized;
}

export async function GET(req: Request) {
  try {
    await ensureZtBootstrap();
    const role = ztRoleFromRequest(req);
    const roles = actorRoleCandidatesForZt(role);
    const rows = await prisma.ztSubmission.findMany({
      where:
        role === "GENERAL" || role === "ADMIN" || role === "SUPERADMIN"
          ? undefined
          : { actorRole: { in: roles } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json({ items: rows });
  } catch (error) {
    return NextResponse.json(
      {
        error: "submissions_unavailable",
        message: error instanceof Error ? error.message : "submissions unavailable",
      },
      { status: 503 },
    );
  }
}

export async function POST(req: Request) {
  try {
    await ensureZtBootstrap();
    const role = ztRoleFromRequest(req);
    const uctx = getRequestUserContext(req);
    const body = (await req.json()) as {
      taskId?: string;
      intelDefId?: string;
      title?: string;
      content?: string;
      region?: string;
      format?: string;
      signalType?: string;
      extraFields?: Record<string, unknown>;
    };

    const title = String(body.title ?? "").trim();
    const content = String(body.content ?? "").trim();
    if (!title || !content) {
      return NextResponse.json({ error: "title/content required" }, { status: 400 });
    }

    const intelDefId = String(body.intelDefId ?? "").trim();
    if (!intelDefId) {
      return NextResponse.json(
        { error: "intelDefId required (请先选择商业情报定义)" },
        { status: 400 },
      );
    }
    const intelDef = await prisma.ztIntelDefinition.findFirst({
      where: { id: intelDefId, isActive: true },
    });
    if (!intelDef) {
      return NextResponse.json(
        { error: "invalid intelDefId (情报定义不存在或未启用)" },
        { status: 400 },
      );
    }

    const signalType = String(body.signalType ?? "tactical").trim();
    const format = String(body.format ?? "text").trim();
    const allowedSignalTypes = (() => {
      try {
        const parsed = JSON.parse(intelDef.allowedSignalTypesJson) as unknown;
        return Array.isArray(parsed)
          ? parsed.map((x) => String(x).trim()).filter(Boolean)
          : [];
      } catch {
        return [];
      }
    })();
    const allowedFormats = (() => {
      try {
        const parsed = JSON.parse(intelDef.allowedFormatsJson) as unknown;
        return Array.isArray(parsed)
          ? parsed.map((x) => String(x).trim()).filter(Boolean)
          : [];
      } catch {
        return [];
      }
    })();
    if (allowedSignalTypes.length > 0 && !allowedSignalTypes.includes(signalType)) {
      return NextResponse.json(
        { error: `signalType not allowed, expected: ${allowedSignalTypes.join("/")}` },
        { status: 400 },
      );
    }
    if (allowedFormats.length > 0 && !allowedFormats.includes(format)) {
      return NextResponse.json(
        { error: `format not allowed, expected: ${allowedFormats.join("/")}` },
        { status: 400 },
      );
    }

    const requiredFields = (() => {
      try {
        const parsed = JSON.parse(intelDef.requiredFieldsJson) as unknown;
        return Array.isArray(parsed)
          ? parsed.map((x) => String(x).trim()).filter(Boolean)
          : [];
      } catch {
        return [];
      }
    })();
    const extraFields = sanitizeExtraFields(body.extraFields);
    const submittedFieldMap: Record<string, unknown> = {
      title,
      content,
      region: String(body.region ?? ""),
      signalType,
      format,
      ...extraFields,
    };
    const missingRequired = pickRequiredFieldMisses(requiredFields, {
      ...submittedFieldMap,
    });
    if (missingRequired.length > 0) {
      return NextResponse.json(
        { error: `missing required fields: ${missingRequired.join(",")}` },
        { status: 400 },
      );
    }

    const created = await prisma.$transaction(async (tx) => {
      const submission = await tx.ztSubmission.create({
        data: {
          taskId: body.taskId ? String(body.taskId) : null,
          intelDefId: intelDef.id,
          title,
          content,
          signalType,
          region: String(body.region ?? ""),
          format,
          userId: uctx.userId,
          actorName: uctx.userEmail ?? "",
          actorRole: role,
          status: "APPROVED",
          pointsGranted: 8,
          extraJson: JSON.stringify(extraFields),
        },
      });

      if (body.taskId) {
        await tx.ztBountyTask.update({
          where: { id: String(body.taskId) },
          data: { status: "CLAIMED" },
        });
      }

      const pointsState = await applyPointsAndSyncRank(tx, {
        userId: uctx.userId,
        actorRole: uctx.ztRole,
        pointsDelta: 8,
        action: "SUBMISSION_APPROVED",
        reason: "情报提交审核通过",
        refType: "submission",
        refId: submission.id,
      });

      return { submission, pointsState };
    });

    return NextResponse.json({
      ...created,
      feedback: {
        pointsDelta: 8,
        currentPoints: created.pointsState.wallet.points,
        rank: created.pointsState.rankLabel,
        rankChanged: created.pointsState.rankChanged,
        ledgerId: created.pointsState.ledgerId,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "submission_create_failed",
        message:
          error instanceof Error ? error.message : "submission create failed",
      },
      { status: 503 },
    );
  }
}
