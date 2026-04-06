"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { demoHeaders } from "@/components/RoleSwitcher";
import { withClientBasePath } from "@/lib/client-url";

type CheckItem = {
  key: string;
  label: string;
  path: string;
  expected: number[];
};

type CheckResult = {
  key: string;
  status: number;
  ok: boolean;
  latencyMs: number;
  message: string;
  url: string;
};

type MonitoringPayload = {
  ok: boolean;
  status: "ok" | "warning" | "critical";
  sampledAt: string;
  scope: string;
  thresholds: {
    availabilityPct: number;
    p95LatencyMs: number;
    errorRatePct: number;
    sampledAt?: string;
    scope?: string;
  };
  probe: {
    total: number;
    success: number;
    availabilityPct: number;
    errorRatePct: number;
    p95LatencyMs: number;
  };
  consistency: {
    windowMinutes: number;
    submissionVsLedger: { submissions: number; ledgers: number; gap: number };
    redemptionVsLedger: { redemptions: number; ledgers: number; gap: number };
    negativeWallets: number;
  };
  alerts: Array<{
    id: string;
    severity: "warning" | "critical";
    message: string;
  }>;
  persistence?: {
    saved: boolean;
    error?: string;
  };
  notification?: {
    enabled: boolean;
    sent: boolean;
    throttled?: boolean;
    skippedReason?: string;
    webhookStatus?: number;
    error?: string;
  };
};

type MonitoringHistoryPayload = {
  ok: boolean;
  summary: {
    total: number;
    statusCounts: { ok: number; warning: number; critical: number };
    avgAvailabilityPct: number;
    avgP95LatencyMs: number;
    avgErrorRatePct: number;
    maxP95LatencyMs: number;
    latestStatus: "ok" | "warning" | "critical";
    latestSampledAt: string | null;
  };
  items: Array<{
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
  }>;
};

const CHECKS: CheckItem[] = [
  { key: "page-portal", label: "首页门户", path: "/", expected: [200] },
  { key: "page-dashboard", label: "盈利工作台页面", path: "/dashboard", expected: [200] },
  { key: "page-projects", label: "项目列表页面", path: "/projects", expected: [200] },
  { key: "page-new", label: "新建报价页面", path: "/projects/new", expected: [200] },
  { key: "page-console", label: "管理后台页面", path: "/console", expected: [200, 401] },
  { key: "page-zt007", label: "智探007页面", path: "/zt007", expected: [200] },
  { key: "api-health", label: "基础健康API", path: "/api/health", expected: [200] },
  { key: "api-customers", label: "客户API", path: "/api/customers", expected: [200] },
  { key: "api-projects", label: "项目API", path: "/api/projects", expected: [200] },
  {
    key: "api-quote-parse",
    label: "报价助手API",
    path: "/api/assistant/quote-parse",
    expected: [200],
  },
  {
    key: "api-llm-status",
    label: "LLM状态API",
    path: "/api/assistant/ollama-status",
    expected: [200],
  },
  { key: "api-zt-overview", label: "智探007总览API", path: "/api/zt/overview", expected: [200] },
  {
    key: "api-zt-actions",
    label: "智探007行动卡API",
    path: "/api/zt/action-cards",
    expected: [200],
  },
  {
    key: "api-zt-submissions",
    label: "智探007提交记录API",
    path: "/api/zt/submissions/recent",
    expected: [200],
  },
  {
    key: "api-zt-me",
    label: "智探007个人工作台API（demo兼容）",
    path: "/api/zt/me",
    expected: [200],
  },
  {
    key: "api-zt-console-redemptions",
    label: "智探007兑换审核API（管理员）",
    path: "/api/console/zt/redemptions",
    expected: [200],
  },
];

async function runOne(check: CheckItem): Promise<CheckResult> {
  const started = performance.now();
  const url = withClientBasePath(check.path);
  try {
    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
      headers: {
        ...demoHeaders(),
      },
      credentials: "include",
    });
    const latencyMs = Math.round(performance.now() - started);
    return {
      key: check.key,
      status: res.status,
      ok: check.expected.includes(res.status),
      latencyMs,
      message: check.expected.includes(res.status)
        ? "正常"
        : `状态码异常（期望 ${check.expected.join("/")})`,
      url,
    };
  } catch (error) {
    const latencyMs = Math.round(performance.now() - started);
    return {
      key: check.key,
      status: 0,
      ok: false,
      latencyMs,
      message: error instanceof Error ? error.message : "请求失败",
      url,
    };
  }
}

export function HealthCheckDashboard() {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<CheckResult[]>([]);
  const [ranAt, setRanAt] = useState<string | null>(null);
  const [monitoring, setMonitoring] = useState<MonitoringPayload | null>(null);
  const [monitoringError, setMonitoringError] = useState<string | null>(null);
  const [monitoringHistory, setMonitoringHistory] = useState<MonitoringHistoryPayload | null>(null);
  const [monitoringHistoryError, setMonitoringHistoryError] = useState<string | null>(null);

  const runChecks = useCallback(async () => {
    setRunning(true);
    const rows = await Promise.all(CHECKS.map((c) => runOne(c)));
    try {
      const monitorRes = await fetch(withClientBasePath("/api/zt/monitoring"), {
        method: "GET",
        cache: "no-store",
        headers: { ...demoHeaders() },
        credentials: "include",
      });
      if (!monitorRes.ok) {
        throw new Error(`monitoring http ${monitorRes.status}`);
      }
      const monitorJson = (await monitorRes.json()) as MonitoringPayload;
      setMonitoring(monitorJson);
      setMonitoringError(null);
    } catch (error) {
      setMonitoring(null);
      setMonitoringError(error instanceof Error ? error.message : "monitoring fetch failed");
    }
    try {
      const historyRes = await fetch(
        withClientBasePath("/api/zt/monitoring/history?limit=24"),
        {
          method: "GET",
          cache: "no-store",
          headers: { ...demoHeaders() },
          credentials: "include",
        },
      );
      if (!historyRes.ok) {
        throw new Error(`monitoring history http ${historyRes.status}`);
      }
      const historyJson = (await historyRes.json()) as MonitoringHistoryPayload;
      setMonitoringHistory(historyJson);
      setMonitoringHistoryError(null);
    } catch (error) {
      setMonitoringHistory(null);
      setMonitoringHistoryError(
        error instanceof Error ? error.message : "monitoring history fetch failed",
      );
    }
    setResults(rows);
    setRanAt(new Date().toISOString());
    setRunning(false);
  }, []);

  useEffect(() => {
    void runChecks();
  }, [runChecks]);

  const summary = useMemo(() => {
    const total = results.length;
    const ok = results.filter((r) => r.ok).length;
    return { total, ok, fail: total - ok };
  }, [results]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div>
          <h2 className="text-base font-semibold">系统健康检查</h2>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            自动检查页面与核心 API 的可达性；用于上线后快速验收与日常巡检。
          </p>
        </div>
        <button
          type="button"
          disabled={running}
          onClick={() => void runChecks()}
          className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400"
        >
          {running ? "检查中…" : "重新检查"}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card label="总检查项" value={String(summary.total)} />
        <Card label="通过" value={String(summary.ok)} accent="ok" />
        <Card label="异常" value={String(summary.fail)} accent={summary.fail > 0 ? "fail" : "ok"} />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">智探007监控告警面板（P2）</h3>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              阈值：可用率&gt;={monitoring?.thresholds.availabilityPct ?? 99}% · P95&lt;={monitoring?.thresholds.p95LatencyMs ?? 1500}ms · 错误率&lt;={monitoring?.thresholds.errorRatePct ?? 1}%
            </p>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              monitoring?.status === "critical"
                ? "bg-rose-100 text-rose-800 dark:bg-rose-900/35 dark:text-rose-300"
                : monitoring?.status === "warning"
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-900/35 dark:text-amber-300"
                  : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/35 dark:text-emerald-300"
            }`}
          >
            {monitoring?.status === "critical"
              ? "严重告警"
              : monitoring?.status === "warning"
                ? "预警"
                : "正常"}
          </span>
        </div>
        {monitoringError ? (
          <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">
            监控数据拉取失败：{monitoringError}
          </p>
        ) : null}
        {monitoring ? (
          <>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Card label="可用率" value={`${monitoring.probe.availabilityPct}%`} accent={monitoring.probe.availabilityPct >= monitoring.thresholds.availabilityPct ? "ok" : "fail"} />
              <Card label="P95 延迟" value={`${monitoring.probe.p95LatencyMs}ms`} accent={monitoring.probe.p95LatencyMs <= monitoring.thresholds.p95LatencyMs ? "ok" : "fail"} />
              <Card label="错误率" value={`${monitoring.probe.errorRatePct}%`} accent={monitoring.probe.errorRatePct <= monitoring.thresholds.errorRatePct ? "ok" : "fail"} />
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Card
                label="提交-记账差值(1h)"
                value={String(monitoring.consistency.submissionVsLedger.gap)}
                accent={monitoring.consistency.submissionVsLedger.gap === 0 ? "ok" : "fail"}
              />
              <Card
                label="兑换-记账差值(1h)"
                value={String(monitoring.consistency.redemptionVsLedger.gap)}
                accent={monitoring.consistency.redemptionVsLedger.gap === 0 ? "ok" : "fail"}
              />
              <Card
                label="负积分钱包"
                value={String(monitoring.consistency.negativeWallets)}
                accent={monitoring.consistency.negativeWallets === 0 ? "ok" : "fail"}
              />
            </div>
            <div className="mt-3 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-950/40">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">当前告警</p>
              {monitoring.alerts.length === 0 ? (
                <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">无告警</p>
              ) : (
                <ul className="mt-2 space-y-1.5 text-xs">
                  {monitoring.alerts.map((a) => (
                    <li
                      key={a.id}
                      className={`rounded-md px-2 py-1 ${
                        a.severity === "critical"
                          ? "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                      }`}
                    >
                      [{a.severity === "critical" ? "严重" : "预警"}] {a.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
              采样时间：{new Date(monitoring.sampledAt).toLocaleString("zh-CN")} · 监控视角：{monitoring.scope}
            </p>
            <div className="mt-2 rounded-lg border border-slate-200/80 bg-slate-50/70 px-3 py-2 text-[11px] dark:border-slate-700 dark:bg-slate-950/40">
              <p className="font-medium text-slate-700 dark:text-slate-200">监控持久化与通知</p>
              <p className="mt-1 text-slate-600 dark:text-slate-400">
                快照落盘：{monitoring.persistence?.saved ? "成功" : "失败"}
                {monitoring.persistence?.error ? `（${monitoring.persistence.error}）` : ""}
              </p>
              <p className="mt-1 text-slate-600 dark:text-slate-400">
                通知通道：
                {!monitoring.notification?.enabled
                  ? "未配置 webhook"
                  : monitoring.notification.sent
                    ? "已发送"
                    : monitoring.notification.throttled
                      ? "5分钟内同类告警已节流"
                      : monitoring.notification.skippedReason === "no_alerts"
                        ? "当前无告警，无需发送"
                        : monitoring.notification.error
                          ? `发送失败（${monitoring.notification.error}）`
                          : "待发送/已跳过"}
              </p>
            </div>
          </>
        ) : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">监控趋势（最近24次采样）</h3>
        {monitoringHistoryError ? (
          <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">
            趋势数据拉取失败：{monitoringHistoryError}
          </p>
        ) : null}
        {monitoringHistory ? (
          <>
            <div className="mt-3 grid gap-3 sm:grid-cols-4">
              <Card label="采样数" value={String(monitoringHistory.summary.total)} />
              <Card
                label="平均可用率"
                value={`${monitoringHistory.summary.avgAvailabilityPct}%`}
                accent={monitoringHistory.summary.avgAvailabilityPct >= 99 ? "ok" : "fail"}
              />
              <Card
                label="平均P95"
                value={`${monitoringHistory.summary.avgP95LatencyMs}ms`}
                accent={monitoringHistory.summary.avgP95LatencyMs <= 1500 ? "ok" : "fail"}
              />
              <Card
                label="平均错误率"
                value={`${monitoringHistory.summary.avgErrorRatePct}%`}
                accent={monitoringHistory.summary.avgErrorRatePct <= 1 ? "ok" : "fail"}
              />
            </div>
            <div className="mt-3 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 text-xs dark:border-slate-700 dark:bg-slate-950/40">
              <p className="font-medium text-slate-700 dark:text-slate-200">
                状态分布：正常 {monitoringHistory.summary.statusCounts.ok} · 预警{" "}
                {monitoringHistory.summary.statusCounts.warning} · 严重{" "}
                {monitoringHistory.summary.statusCounts.critical}
              </p>
              <p className="mt-1 text-slate-600 dark:text-slate-400">
                最近状态：{monitoringHistory.summary.latestStatus} · 最近采样：
                {monitoringHistory.summary.latestSampledAt
                  ? new Date(monitoringHistory.summary.latestSampledAt).toLocaleString(
                      "zh-CN",
                    )
                  : "无"}
              </p>
            </div>
            <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-50 text-slate-500 dark:bg-slate-950/50 dark:text-slate-400">
                  <tr>
                    <th className="px-2 py-1.5">采样时间</th>
                    <th className="px-2 py-1.5">状态</th>
                    <th className="px-2 py-1.5 text-right">可用率</th>
                    <th className="px-2 py-1.5 text-right">P95</th>
                    <th className="px-2 py-1.5 text-right">错误率</th>
                    <th className="px-2 py-1.5 text-right">告警数</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {monitoringHistory.items.slice(0, 8).map((x) => (
                    <tr key={x.id}>
                      <td className="px-2 py-1.5 text-slate-600 dark:text-slate-400">
                        {new Date(x.sampledAt).toLocaleTimeString("zh-CN")}
                      </td>
                      <td className="px-2 py-1.5">
                        <span
                          className={`rounded-full px-1.5 py-0.5 ${
                            x.status === "critical"
                              ? "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300"
                              : x.status === "warning"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                                : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                          }`}
                        >
                          {x.status}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{x.availabilityPct}%</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{x.p95LatencyMs}ms</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{x.errorRatePct}%</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{x.alertsCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </section>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 dark:bg-slate-950/50 dark:text-slate-400">
            <tr>
              <th className="px-3 py-2">检查项</th>
              <th className="px-3 py-2">URL</th>
              <th className="px-3 py-2 text-right">状态码</th>
              <th className="px-3 py-2 text-right">耗时(ms)</th>
              <th className="px-3 py-2">结果</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {results.map((r) => {
              const meta = CHECKS.find((x) => x.key === r.key);
              return (
                <tr key={r.key}>
                  <td className="px-3 py-2 font-medium">{meta?.label ?? r.key}</td>
                  <td className="max-w-[280px] truncate px-3 py-2 text-slate-500">{r.url}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.status}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.latencyMs}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 ${
                        r.ok
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                          : "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300"
                      }`}
                    >
                      {r.message}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-slate-500 dark:text-slate-400">
        最近检查时间：{ranAt ? new Date(ranAt).toLocaleString("zh-CN") : "未执行"}
      </p>
    </div>
  );
}

function Card({
  label,
  value,
  accent = "normal",
}: {
  label: string;
  value: string;
  accent?: "normal" | "ok" | "fail";
}) {
  const cls =
    accent === "ok"
      ? "text-emerald-700 dark:text-emerald-300"
      : accent === "fail"
        ? "text-rose-700 dark:text-rose-300"
        : "text-slate-900 dark:text-slate-100";
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-[11px] text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${cls}`}>{value}</p>
    </div>
  );
}
