import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequestUserContext } from "@/lib/request-user";

export const dynamic = "force-dynamic";

const MONITORING_ROUTE = "/api/zt/monitoring";
const SNAPSHOT_ACTION = "zt_monitoring_snapshot";

type SnapshotMeta = {
  sampledAt?: string;
  scope?: string;
  status?: "ok" | "warning" | "critical";
  probe?: {
    availabilityPct?: number;
    errorRatePct?: number;
    p95LatencyMs?: number;
  };
  consistency?: {
    submissionVsLedger?: { gap?: number };
    redemptionVsLedger?: { gap?: number };
    negativeWallets?: number;
  };
  alerts?: Array<{
    id?: string;
    severity?: "warning" | "critical";
    message?: string;
  }>;
};

type HistoryItem = {
  id: string;
  sampledAt: string;
  status: "ok" | "warning" | "critical";
  scope: string;
  availabilityPct: number;
  errorRatePct: number;
  p95LatencyMs: number;
  submissionLedgerGap: number;
  redemptionLedgerGap: number;
  negativeWallets: number;
  alertsCount: number;
  criticalAlerts: number;
  warningAlerts: number;
};

function toPositiveInt(raw: string | null, fallback: number, cap: number): number {
  const n = Number(raw ?? "");
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(Math.floor(n), cap);
}

function toMeta(raw: string): SnapshotMeta | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as SnapshotMeta;
  } catch {
    return null;
  }
}

function coerceStatus(input: unknown): "ok" | "warning" | "critical" {
  if (input === "critical" || input === "warning") return input;
  return "ok";
}

function mapRowToHistoryItem(
  row: { id: string; createdAt: Date; metaJson: string },
): HistoryItem | null {
  const meta = toMeta(row.metaJson);
  if (!meta) return null;
  const alerts = Array.isArray(meta.alerts) ? meta.alerts : [];
  const sampledAt = typeof meta.sampledAt === "string" ? meta.sampledAt : row.createdAt.toISOString();
  const status = coerceStatus(meta.status);
  const availabilityPct = Number(meta.probe?.availabilityPct ?? 0);
  const errorRatePct = Number(meta.probe?.errorRatePct ?? 0);
  const p95LatencyMs = Number(meta.probe?.p95LatencyMs ?? 0);
  const submissionLedgerGap = Number(meta.consistency?.submissionVsLedger?.gap ?? 0);
  const redemptionLedgerGap = Number(meta.consistency?.redemptionVsLedger?.gap ?? 0);
  const negativeWallets = Number(meta.consistency?.negativeWallets ?? 0);
  const criticalAlerts = alerts.filter((x) => x?.severity === "critical").length;
  const warningAlerts = alerts.filter((x) => x?.severity === "warning").length;

  return {
    id: row.id,
    sampledAt,
    status,
    scope: typeof meta.scope === "string" && meta.scope ? meta.scope : "unknown",
    availabilityPct,
    errorRatePct,
    p95LatencyMs,
    submissionLedgerGap,
    redemptionLedgerGap,
    negativeWallets,
    alertsCount: alerts.length,
    criticalAlerts,
    warningAlerts,
  };
}

function summarize(items: HistoryItem[]) {
  const total = items.length;
  if (total === 0) {
    return {
      total: 0,
      statusCounts: { ok: 0, warning: 0, critical: 0 },
      avgAvailabilityPct: 0,
      avgP95LatencyMs: 0,
      avgErrorRatePct: 0,
      maxP95LatencyMs: 0,
      latestStatus: "ok" as const,
      latestSampledAt: null as string | null,
    };
  }
  const statusCounts = {
    ok: items.filter((x) => x.status === "ok").length,
    warning: items.filter((x) => x.status === "warning").length,
    critical: items.filter((x) => x.status === "critical").length,
  };
  const avgAvailabilityPct =
    Math.round(
      (items.reduce((sum, x) => sum + x.availabilityPct, 0) / total) * 100,
    ) / 100;
  const avgP95LatencyMs =
    Math.round(items.reduce((sum, x) => sum + x.p95LatencyMs, 0) / total);
  const avgErrorRatePct =
    Math.round(
      (items.reduce((sum, x) => sum + x.errorRatePct, 0) / total) * 100,
    ) / 100;
  const maxP95LatencyMs = Math.max(...items.map((x) => x.p95LatencyMs), 0);
  return {
    total,
    statusCounts,
    avgAvailabilityPct,
    avgP95LatencyMs,
    avgErrorRatePct,
    maxP95LatencyMs,
    latestStatus: items[0]?.status ?? "ok",
    latestSampledAt: items[0]?.sampledAt ?? null,
  };
}

export async function GET(req: Request) {
  const ctx = getRequestUserContext(req);
  if (!ctx.isZtManager) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const limit = toPositiveInt(url.searchParams.get("limit"), 60, 500);

  const rows = await prisma.agentAuditLog.findMany({
    where: {
      route: MONITORING_ROUTE,
      action: SNAPSHOT_ACTION,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      createdAt: true,
      metaJson: true,
    },
  });

  const items = rows
    .map((row) => mapRowToHistoryItem(row))
    .filter((x): x is HistoryItem => Boolean(x));

  return NextResponse.json({
    ok: true,
    summary: summarize(items),
    items,
  });
}
