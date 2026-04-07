import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { newRequestId, withRequestIdHeader } from "@/lib/agent-audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const requestId = newRequestId();
  const { id } = await ctx.params;
  const submissionId = (id || "").trim();
  if (!submissionId) {
    return NextResponse.json(
      { code: 40001, message: "invalid submission id", requestId },
      { status: 400, headers: withRequestIdHeader(requestId) },
    );
  }

  try {
    const row = await prisma.diagSubmission.findUnique({
      where: { id: submissionId },
    });
    if (!row) {
      return NextResponse.json(
        { code: 40401, message: "submission not found", requestId },
        { status: 404, headers: withRequestIdHeader(requestId) },
      );
    }
    return NextResponse.json(
      {
        code: 0,
        message: "ok",
        data: {
          submissionId: row.id,
          industryEdition: row.industryEdition,
          questionnaireVersion: row.questionnaireVersion,
          scoringModelVersion: row.scoringModelVersion,
          sourcePage: row.sourcePage,
          qbPayload: row.qbPayload,
          answersPayload: row.answersPayload,
          scorePayload: row.scorePayload,
          reportPayload: row.reportPayload,
          status: row.status,
          createdAt: row.createdAt.toISOString(),
          requestId,
        },
      },
      { headers: withRequestIdHeader(requestId) },
    );
  } catch {
    return NextResponse.json(
      { code: 50001, message: "query failed", requestId },
      { status: 500, headers: withRequestIdHeader(requestId) },
    );
  }
}
