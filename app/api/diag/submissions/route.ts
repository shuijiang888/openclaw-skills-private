import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { demoRoleFromRequest } from "@/lib/http";
import { ADMIN_API_FORBIDDEN } from "@/lib/api-messages";
import {
  makeRequestId,
  sanitizeBodyForLog,
  safeJsonStringify,
  safeJsonValue,
} from "@/lib/diag-security";
import { writeAgentAuditSafe, withRequestIdHeader } from "@/lib/agent-audit";

type SubmissionRequest = {
  industryEdition?: string;
  questionnaireVersion?: string;
  scoringModelVersion?: string;
  sourcePage?: string;
  clientSubmissionId?: string;
  type?: string;
  payload?: unknown;
  payloadJson?: unknown;
  qbPayload?: unknown;
  answersPayload?: unknown;
  clientScorePayload?: unknown;
  reportPayload?: unknown;
  meta?: Record<string, unknown>;
};

function parseLevel(total: number): string {
  if (total >= 85) return "卓越";
  if (total >= 70) return "良好";
  if (total >= 50) return "一般";
  return "薄弱";
}

function normalizedWeighted(input: unknown): number[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v))
    .map((v) => Math.round(v * 10) / 10);
}

function sanitizeSourcePage(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw.startsWith("/diag/")) return "/diag/unknown";
  if (!raw.endsWith(".html")) return "/diag/unknown";
  return raw;
}

export async function GET(req: Request) {
  if (demoRoleFromRequest(req) !== "ADMIN") {
    return NextResponse.json(
      { error: ADMIN_API_FORBIDDEN },
      { status: 403 },
    );
  }

  const requestId = makeRequestId();
  try {
    const rows = await prisma.diagSubmission.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        industryEdition: true,
        questionnaireVersion: true,
        scoringModelVersion: true,
        sourcePage: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return NextResponse.json(
      { code: 0, message: "ok", data: rows },
      { headers: withRequestIdHeader(requestId) },
    );
  } catch {
    return NextResponse.json(
      { code: 50001, message: "query_failed", requestId },
      { status: 500, headers: withRequestIdHeader(requestId) },
    );
  }
}

export async function POST(req: Request) {
  const requestId = makeRequestId();
  const body = (await req.json().catch(() => null)) as SubmissionRequest | null;
  if (!body) {
    return NextResponse.json(
      { code: 40000, message: "invalid_json", requestId },
      { status: 400, headers: withRequestIdHeader(requestId) },
    );
  }

  const industryEdition = String(body.industryEdition ?? "").trim();
  const questionnaireVersion = String(body.questionnaireVersion ?? "").trim();
  const scoringModelVersion = String(body.scoringModelVersion ?? "").trim();
  const sourcePage = sanitizeSourcePage(body.sourcePage);

  if (!industryEdition || !questionnaireVersion || !scoringModelVersion) {
    return NextResponse.json(
      { code: 40001, message: "missing_version_fields", requestId },
      { status: 400, headers: withRequestIdHeader(requestId) },
    );
  }

  const weighted = normalizedWeighted(
    (body.clientScorePayload as { weighted?: unknown } | undefined)?.weighted,
  );
  const total = Number(
    (body.clientScorePayload as { total?: unknown } | undefined)?.total ?? 0,
  );
  const finalTotal = Number.isFinite(total) ? Math.round(total * 10) / 10 : 0;
  const level = parseLevel(finalTotal);

  const payloadJson =
    body.payloadJson ??
    {
      type: body.type ?? "questionnaire_submission",
      payload: body.payload ?? {},
      meta: body.meta ?? {},
      clientSubmissionId: body.clientSubmissionId ?? null,
    };

  try {
    const created = await prisma.diagSubmission.create({
      data: {
        industryEdition,
        questionnaireVersion,
        scoringModelVersion,
        sourcePage,
        requestType: String(body.type ?? "questionnaire_submission"),
        payloadJson: safeJsonStringify(payloadJson),
        submitterIp:
          String((body.meta as { clientIp?: unknown } | undefined)?.clientIp ?? "")
            .trim() || null,
        userAgent:
          String(
            (body.meta as { userAgent?: unknown } | undefined)?.userAgent ??
              req.headers.get("user-agent") ??
              "",
          ).trim() || null,
        qbPayload: safeJsonStringify(body.qbPayload ?? {}),
        answersPayload: safeJsonStringify(body.answersPayload ?? {}),
        scorePayload: safeJsonStringify({
          weighted,
          total: finalTotal,
          level,
        }),
        reportPayload: safeJsonStringify(
          (body.reportPayload as object | undefined) ??
          {
            top3: [],
            advice: "建议结合顾问复盘进一步确认优先改进项。",
          },
        ),
      },
      select: {
        id: true,
        industryEdition: true,
        questionnaireVersion: true,
        scoringModelVersion: true,
        payloadJson: true,
        createdAt: true,
      },
    });

    await writeAgentAuditSafe({
      requestId,
      route: "/api/diag/submissions",
      action: "diag_submission_create",
      req,
      meta: {
        submissionId: created.id,
        industryEdition,
        sourcePage,
        body: sanitizeBodyForLog(body),
      },
    });

    return NextResponse.json(
      {
        code: 0,
        message: "ok",
        data: {
          submissionId: created.id,
          industryEdition: created.industryEdition,
          questionnaireVersion: created.questionnaireVersion,
          scoringModelVersion: created.scoringModelVersion,
          scorePayload: {
            weighted,
            total: finalTotal,
            level,
          },
          payloadJsonStored: true,
          payloadJson: safeJsonValue(created.payloadJson),
          createdAt: created.createdAt.toISOString(),
        },
      },
      { headers: withRequestIdHeader(requestId) },
    );
  } catch {
    return NextResponse.json(
      { code: 50002, message: "submission_create_failed", requestId },
      { status: 500, headers: withRequestIdHeader(requestId) },
    );
  }
}
