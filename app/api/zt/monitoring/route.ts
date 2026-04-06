import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureZtBootstrap } from "@/lib/zt-bootstrap";
import { getRequestUserContext } from "@/lib/request-user";
import { actorRoleCandidatesForZt } from "@/lib/zt-ranks";

export const dynamic = "force-dynamic";

const PROBE_ENDPOINTS = [
  "/api/zt/overview",
  "/api/zt/action-cards",
  "/api/zt/bounty-tasks",
  "/api/zt/submissions/recent",
  "/api/zt/redemptions",
] as const;

const ALERT_THRESHOLDS = {
  availabilityPct: 99,
  p95LatencyMs: 1500,
  errorRatePct: 1,
} as const;

type ProbeRow = {
  path: string;
  status: number;
  ok: boolean;
  latencyMs: number;
};

type AlertRow = {
  id: string;
  severity: "warning" | "critical";
  message: string;
};

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function p95(input: number[]): number {
  if (input.length === 0) return 0;
  const sorted = [...input].sort((a, b) => a - b);
  const idx = Math.max(0, Math.ceil(sorted.length * 0.95) - 1);
  return sorted[idx] ?? 0;
}

function pickForwardHeaders(req: Request): Headers {
  const source = req.headers;
  const out = new Headers();
  const passthrough = [
    "cookie",
    "x-demo-role",
    "x-profit-session-role",
    "x-profit-session-zt-role",
    "x-profit-session-user-id",
    "x-profit-session-email",
    "x-profit-session-name",
    "x-profit-session-superadmin",
    "x-profit-session-must-change-password",
  ] as const;
  for (const name of passthrough) {
    const value = source.get(name);
    if (value) out.set(name, value);
  }
  return out;
}

export async function GET(req: Request) {
  try {
    await ensureZtBootstrap();
    const ctx = getRequestUserContext(req);
    const actorRoles = actorRoleCandidatesForZt(ctx.ztRole);
    const since = new Date(Date.now() - 60 * 60 * 1000);

    const scopeTag = ctx.isZtManager
      ? "global"
      : ctx.userId
        ? `user:${ctx.userId}`
        : `role:${actorRoles.join("/")}`;

    const submissionScope = ctx.isZtManager
      ? {}
      : ctx.userId
        ? {
            OR: [{ userId: ctx.userId }, { actorRole: { in: actorRoles } }],
          }
        : { actorRole: { in: actorRoles } };
    const ledgerScope = ctx.isZtManager
      ? {}
      : ctx.userId
        ? {
            OR: [{ userId: ctx.userId }, { actorRole: { in: actorRoles } }],
          }
        : { actorRole: { in: actorRoles } };
    const redemptionScope = ctx.isZtManager
      ? {}
      : ctx.userId
        ? {
            OR: [{ userId: ctx.userId }, { actorRole: { in: actorRoles } }],
          }
        : { actorRole: { in: actorRoles } };
    const walletScope = ctx.isZtManager
      ? {}
      : ctx.userId
        ? {
            OR: [{ userId: ctx.userId }, { actorRole: { in: actorRoles } }],
          }
        : { actorRole: { in: actorRoles } };

    const [
      recentSubmissionCount,
      recentSubmissionLedgerCount,
      recentRedemptionCount,
      recentRedeemLedgerCount,
      negativeWalletCount,
    ] = await Promise.all([
      prisma.ztSubmission.count({
        where: {
          createdAt: { gte: since },
          ...submissionScope,
        },
      }),
      prisma.ztPointLedger.count({
        where: {
          createdAt: { gte: since },
          action: "SUBMISSION_APPROVED",
          ...ledgerScope,
        },
      }),
      prisma.ztRedemption.count({
        where: {
          createdAt: { gte: since },
          ...redemptionScope,
        },
      }),
      prisma.ztPointLedger.count({
        where: {
          createdAt: { gte: since },
          action: "REDEEM_REQUEST",
          ...ledgerScope,
        },
      }),
      prisma.ztPointWallet.count({
        where: {
          points: { lt: 0 },
          ...walletScope,
        },
      }),
    ]);

    const origin = new URL(req.url).origin;
    const headers = pickForwardHeaders(req);
    const probeRows: ProbeRow[] = [];
    for (const path of PROBE_ENDPOINTS) {
      const started = Date.now();
      try {
        const res = await fetch(`${origin}${path}`, {
          method: "GET",
          headers,
          cache: "no-store",
        });
        const latencyMs = Date.now() - started;
        probeRows.push({
          path,
          status: res.status,
          ok: res.status >= 200 && res.status < 500,
          latencyMs,
        });
      } catch {
        probeRows.push({
          path,
          status: 0,
          ok: false,
          latencyMs: Date.now() - started,
        });
      }
    }

    const success = probeRows.filter((x) => x.ok).length;
    const total = probeRows.length;
    const availabilityPct = total > 0 ? round2((success / total) * 100) : 0;
    const errorRatePct = round2(100 - availabilityPct);
    const p95LatencyMs = p95(probeRows.map((x) => x.latencyMs));

    const submissionLedgerGap = recentSubmissionCount - recentSubmissionLedgerCount;
    const redemptionLedgerGap = recentRedemptionCount - recentRedeemLedgerCount;

    const alerts: AlertRow[] = [];
    if (availabilityPct < ALERT_THRESHOLDS.availabilityPct) {
      alerts.push({
        id: "availability_low",
        severity: "critical",
        message: `可用率 ${availabilityPct}% 低于阈值 ${ALERT_THRESHOLDS.availabilityPct}%`,
      });
    }
    if (p95LatencyMs > ALERT_THRESHOLDS.p95LatencyMs) {
      alerts.push({
        id: "latency_p95_high",
        severity: "warning",
        message: `P95 延迟 ${p95LatencyMs}ms 高于阈值 ${ALERT_THRESHOLDS.p95LatencyMs}ms`,
      });
    }
    if (errorRatePct > ALERT_THRESHOLDS.errorRatePct) {
      alerts.push({
        id: "error_rate_high",
        severity: "critical",
        message: `错误率 ${errorRatePct}% 高于阈值 ${ALERT_THRESHOLDS.errorRatePct}%`,
      });
    }
    if (submissionLedgerGap !== 0) {
      alerts.push({
        id: "submission_ledger_mismatch",
        severity: "warning",
        message: `最近1小时情报提交(${recentSubmissionCount})与记账流水(${recentSubmissionLedgerCount})不一致，差值 ${submissionLedgerGap}`,
      });
    }
    if (redemptionLedgerGap !== 0) {
      alerts.push({
        id: "redemption_ledger_mismatch",
        severity: "warning",
        message: `最近1小时兑换申请(${recentRedemptionCount})与记账流水(${recentRedeemLedgerCount})不一致，差值 ${redemptionLedgerGap}`,
      });
    }
    if (negativeWalletCount > 0) {
      alerts.push({
        id: "negative_wallet_detected",
        severity: "critical",
        message: `检测到负积分钱包 ${negativeWalletCount} 个`,
      });
    }

    const status = alerts.some((x) => x.severity === "critical")
      ? "critical"
      : alerts.length > 0
        ? "warning"
        : "ok";

    return NextResponse.json({
      ok: status === "ok",
      status,
      sampledAt: new Date().toISOString(),
      scope: scopeTag,
      thresholds: ALERT_THRESHOLDS,
      probe: {
        total,
        success,
        availabilityPct,
        errorRatePct,
        p95LatencyMs,
        endpoints: probeRows,
      },
      consistency: {
        windowMinutes: 60,
        submissionVsLedger: {
          submissions: recentSubmissionCount,
          ledgers: recentSubmissionLedgerCount,
          gap: submissionLedgerGap,
        },
        redemptionVsLedger: {
          redemptions: recentRedemptionCount,
          ledgers: recentRedeemLedgerCount,
          gap: redemptionLedgerGap,
        },
        negativeWallets: negativeWalletCount,
      },
      alerts,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        status: "critical",
        error: "monitoring_unavailable",
        message:
          error instanceof Error ? error.message : "zt monitoring unavailable",
      },
      { status: 503 },
    );
  }
}
