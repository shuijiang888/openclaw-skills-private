import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { newRequestId, withRequestIdHeader } from "@/lib/agent-audit";
import { safeJsonStringify } from "@/lib/diag-security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Body = {
  submissionId?: string;
  name?: string;
  phone?: string;
  company?: string;
  role?: string;
  roleTitle?: string;
  bookingIntent?: boolean;
  type?: string;
  payload?: unknown;
};

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/**
 * Compatible helper endpoint:
 * - Auto creates diagnosis_summary lead without requiring leadKind in payload.
 * - Allows legacy callers to only send submissionId + minimal lead info.
 */
export async function POST(req: Request) {
  const requestId = newRequestId();
  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body) {
    return NextResponse.json(
      { code: 40000, message: "invalid_json", requestId },
      { status: 400, headers: withRequestIdHeader(requestId) },
    );
  }

  const submissionId = str(body.submissionId);
  if (!submissionId) {
    return NextResponse.json(
      { code: 40001, message: "submissionId required", requestId },
      { status: 400, headers: withRequestIdHeader(requestId) },
    );
  }

  const exists = await prisma.diagSubmission.findUnique({
    where: { id: submissionId },
    select: { id: true },
  });
  if (!exists) {
    return NextResponse.json(
      { code: 40401, message: "submission not found", requestId },
      { status: 404, headers: withRequestIdHeader(requestId) },
    );
  }

  const name = str(body.name) || "报告访客";
  const phone = str(body.phone) || "H5-N/A";
  const company = str(body.company) || "未填写";
  const roleTitle = str(body.roleTitle) || str(body.role);
  const bookingIntent = Boolean(body.bookingIntent);

  try {
    const lead = await prisma.diagLead.create({
      data: {
        submissionId,
        leadKind: "diagnosis_summary",
        name,
        phone,
        company,
        roleTitle: roleTitle || null,
        bookingIntent,
        payloadJson: safeJsonStringify({
          type: body.type ?? "lead_capture",
          payload: body.payload ?? {},
          requestBody: body,
        }),
      },
    });

    await prisma.diagSyncJob.create({
      data: {
        submissionId,
        target: "fxiaoke",
        operation: "diagnosis_summary",
        idempotencyKey: `lead:${lead.id}:diagnosis_summary`,
        payload: safeJsonStringify({
          leadId: lead.id,
          submissionId,
          leadKind: "diagnosis_summary",
          name,
          phone,
          company,
          roleTitle,
          bookingIntent,
        }),
        status: "pending",
      },
    });

    return NextResponse.json(
      {
        code: 0,
        message: "ok",
        data: {
          leadId: lead.id,
          submissionId,
          leadKind: "diagnosis_summary",
          createdAt: lead.createdAt.toISOString(),
        },
      },
      { headers: withRequestIdHeader(requestId) },
    );
  } catch {
    return NextResponse.json(
      { code: 50001, message: "internal_error", requestId },
      { status: 500, headers: withRequestIdHeader(requestId) },
    );
  }
}
