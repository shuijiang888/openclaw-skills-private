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

  const runChecks = useCallback(async () => {
    setRunning(true);
    const rows = await Promise.all(CHECKS.map((c) => runOne(c)));
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
