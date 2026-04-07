import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { newRequestId, withRequestIdHeader } from "@/lib/agent-audit";
import {
  deriveClientIp,
  getSafeUserAgent,
  maskPhone,
  normalizeLeadKind,
  safeJsonStringify,
  type LeadKind,
} from "@/lib/diag-security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function toStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export async function POST(req: Request) {
  const requestId = newRequestId();
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const submissionId = toStr(body.submissionId);
    const leadKind = normalizeLeadKind(toStr(body.leadKind)) as LeadKind | null;
    const name = toStr(body.name);
    const phone = toStr(body.phone);
    const company = toStr(body.company);
    const roleTitle = toStr(body.role) || toStr(body.roleTitle);
    const bookingIntent = Boolean(body.bookingIntent);

    if (!submissionId || !leadKind || !name || !phone || !company) {
      return NextResponse.json(
        {
          code: 40001,
          message:
            "invalid parameters: submissionId/leadKind/name/phone/company required",
          requestId,
        },
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

    const lead = await prisma.diagLead.create({
      data: {
        submissionId,
        leadKind,
        name,
        phone,
        company,
        roleTitle,
        bookingIntent,
        payloadJson: safeJsonStringify(body),
      },
    });

    await prisma.diagSyncJob.create({
      data: {
        submissionId,
        target: "fxiaoke",
        operation: leadKind,
        idempotencyKey: `lead:${lead.id}:${leadKind}`,
        payload: safeJsonStringify({
          leadId: lead.id,
          submissionId,
          leadKind,
          name,
          phoneMasked: maskPhone(phone),
          company,
          roleTitle,
          bookingIntent,
          ip: deriveClientIp(req),
          ua: getSafeUserAgent(req),
        }),
        status: "pending",
      },
    });

    return NextResponse.json(
      {
        code: 0,
        message: "ok",
        data: {
          leadId: String(lead.id),
          submissionId: lead.submissionId,
          leadKind: lead.leadKind,
          syncStatus: "pending",
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
