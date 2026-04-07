import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  maskIp,
  normalizeIndustryEdition,
  validateDateOnly,
  toIsoDateOnly,
} from "@/lib/diag-security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseDateOrNull(v: string | null): Date | null {
  if (!v) return null;
  const s = v.trim();
  if (!validateDateOnly(s)) return null;
  const d = new Date(`${s}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function parseScoreTotal(scorePayloadRaw: string | null): number | null {
  if (!scorePayloadRaw) return null;
  try {
    const obj = JSON.parse(scorePayloadRaw) as { total?: unknown };
    const total = Number(obj.total);
    if (!Number.isFinite(total)) return null;
    return total;
  } catch {
    return null;
  }
}

function parseLevel(scorePayloadRaw: string | null): string {
  if (!scorePayloadRaw) return "未知";
  try {
    const obj = JSON.parse(scorePayloadRaw) as { level?: unknown };
    if (typeof obj.level === "string" && obj.level.trim()) return obj.level.trim();
    return "未知";
  } catch {
    return "未知";
  }
}

function parseSegments(qbPayloadRaw: string | null): string[] {
  if (!qbPayloadRaw) return [];
  try {
    const obj = JSON.parse(qbPayloadRaw) as {
      q_b2_segments?: unknown;
      q_b2?: unknown;
    };
    const arr = Array.isArray(obj.q_b2_segments)
      ? obj.q_b2_segments
      : Array.isArray(obj.q_b2)
        ? obj.q_b2
        : [];
    return arr
      .map((x) => String(x))
      .map((x) => x.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const industryEdition = normalizeIndustryEdition(
    url.searchParams.get("industryEdition"),
  );
  const from = parseDateOrNull(url.searchParams.get("from"));
  const to = parseDateOrNull(url.searchParams.get("to"));
  if (url.searchParams.get("from") && !from) {
    return NextResponse.json(
      { code: 40001, message: "invalid from date, use YYYY-MM-DD" },
      { status: 400 },
    );
  }
  if (url.searchParams.get("to") && !to) {
    return NextResponse.json(
      { code: 40001, message: "invalid to date, use YYYY-MM-DD" },
      { status: 400 },
    );
  }

  const where: {
    industryEdition?: string;
    createdAt?: { gte?: Date; lte?: Date };
  } = {};
  if (industryEdition) where.industryEdition = industryEdition;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = from;
    if (to) {
      const toInclusive = new Date(to);
      toInclusive.setUTCDate(toInclusive.getUTCDate() + 1);
      where.createdAt.lte = toInclusive;
    }
  }

  const rows = await prisma.diagSubmission.findMany({
    where,
    select: {
      id: true,
      industryEdition: true,
      createdAt: true,
      scorePayload: true,
      qbPayload: true,
    },
    orderBy: { createdAt: "desc" },
    take: 2000,
  });

  let scoreSum = 0;
  let scoreCount = 0;
  const levelDistribution = new Map<string, number>();
  const segmentCounter = new Map<string, number>();

  for (const row of rows) {
    const total = parseScoreTotal(row.scorePayload);
    if (total !== null) {
      scoreSum += total;
      scoreCount += 1;
    }
    const level = parseLevel(row.scorePayload);
    levelDistribution.set(level, (levelDistribution.get(level) ?? 0) + 1);

    const segs = parseSegments(row.qbPayload);
    for (const seg of segs) {
      segmentCounter.set(seg, (segmentCounter.get(seg) ?? 0) + 1);
    }
  }

  const topSegments = Array.from(segmentCounter.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([segment, count]) => ({ segment, count }));

  const fromOut = from ? toIsoDateOnly(from) : null;
  const toOut = to ? toIsoDateOnly(to) : null;

  return NextResponse.json({
    code: 0,
    message: "ok",
    data: {
      industryEdition: industryEdition ?? "all",
      range: { from: fromOut, to: toOut },
      submissionCount: rows.length,
      avgScore:
        scoreCount > 0 ? Math.round((scoreSum / scoreCount) * 100) / 100 : null,
      levelDistribution: Object.fromEntries(levelDistribution.entries()),
      topSegments,
      observer: {
        sampleSizeCappedAt: 2000,
        clientIpMasked: maskIp(req.headers.get("x-forwarded-for") ?? ""),
      },
    },
  });
}
