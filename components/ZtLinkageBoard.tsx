"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { demoHeaders } from "@/components/RoleSwitcher";
import { withClientBasePath } from "@/lib/client-url";

type LinkagePayload = {
  ok: boolean;
  generatedAt: string;
  coverage: {
    submissions: number;
    projects: number;
    tasks: number;
    intelDefinitions: number;
    submissionToProjectLinkRatePct: number;
    avgSignalsPerProject: number;
  };
  byCity: Array<{
    region: string;
    submissions: number;
    approvedProjects: number;
    pendingProjects: number;
    avgSuggestedPrice: number;
    estPotentialRevenue: number;
  }>;
  byIntelDefinition: Array<{
    intelDefId: string;
    name: string;
    category: string;
    submissions: number;
    linkedTaskCount: number;
    mappedProjectCount: number;
  }>;
  topLinkedProjects: Array<{
    id: string;
    name: string;
    customerName: string;
    status: string;
    suggestedPrice: number;
    marginSuggest: number;
    linkedSignals: number;
    linkedIntelDefs: string[];
  }>;
  notes: string[];
};

function money(v: number): string {
  return `¥${Math.round(v).toLocaleString("zh-CN")}`;
}

export function ZtLinkageBoard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<LinkagePayload | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(withClientBasePath("/api/zt/linkage"), {
        method: "GET",
        cache: "no-store",
        headers: { ...demoHeaders() },
        credentials: "include",
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `http_${res.status}`);
      }
      const data = (await res.json()) as LinkagePayload;
      setPayload(data);
    } catch (err) {
      setPayload(null);
      setError(err instanceof Error ? err.message : "load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const kpiCards = useMemo(() => {
    if (!payload) return [];
    return [
      { label: "情报总数", value: String(payload.coverage.submissions) },
      { label: "报价项目总数", value: String(payload.coverage.projects) },
      { label: "任务总数", value: String(payload.coverage.tasks) },
      {
        label: "情报→项目联动率",
        value: `${payload.coverage.submissionToProjectLinkRatePct}%`,
      },
      {
        label: "项目平均关联情报",
        value: String(payload.coverage.avgSignalsPerProject),
      },
      { label: "商情定义数", value: String(payload.coverage.intelDefinitions) },
    ];
  }, [payload]);

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-violet-200/70 bg-gradient-to-br from-violet-50/95 via-white to-slate-50/90 p-4 shadow-sm dark:border-violet-900/40 dark:from-violet-950/30 dark:via-slate-900 dark:to-slate-950">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              情报→商机→报价 联动看板（P2 Batch3）
            </h2>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              先以启发式规则形成跨系统联动可视化，后续可升级为显式主键关联与CRM回写。
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            {loading ? "刷新中…" : "刷新联动数据"}
          </button>
        </div>
      </section>

      {error ? (
        <div className="rounded-xl border border-rose-300/80 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">
          加载失败：{error}
        </div>
      ) : null}

      {payload ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {kpiCards.map((k) => (
              <div
                key={k.label}
                className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{k.label}</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                  {k.value}
                </p>
              </div>
            ))}
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <Panel title="城市联动热度（情报 + 项目）">
              <Table
                headers={["区域", "情报数", "已核准项目", "待审批项目", "估算潜在额"]}
                rows={payload.byCity.map((x) => [
                  x.region,
                  String(x.submissions),
                  String(x.approvedProjects),
                  String(x.pendingProjects),
                  money(x.estPotentialRevenue),
                ])}
              />
            </Panel>
            <Panel title="商情定义联动热度（定义 + 任务 + 项目）">
              <Table
                headers={["定义", "分类", "情报数", "任务数", "映射项目数"]}
                rows={payload.byIntelDefinition.map((x) => [
                  x.name,
                  x.category,
                  String(x.submissions),
                  String(x.linkedTaskCount),
                  String(x.mappedProjectCount),
                ])}
              />
            </Panel>
          </section>

          <Panel title="高联动报价项目（Top 20）">
            <Table
              headers={[
                "项目",
                "客户",
                "状态",
                "建议价",
                "建议毛利",
                "关联情报数",
                "关联定义",
              ]}
              rows={payload.topLinkedProjects.map((x) => [
                x.name,
                x.customerName,
                x.status,
                money(x.suggestedPrice),
                `${x.marginSuggest}%`,
                String(x.linkedSignals),
                x.linkedIntelDefs.join(", ") || "-",
              ])}
            />
          </Panel>

          <section className="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            <p className="font-semibold text-slate-800 dark:text-slate-100">说明</p>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              {payload.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
              生成时间：{new Date(payload.generatedAt).toLocaleString("zh-CN")}
            </p>
          </section>
        </>
      ) : loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          正在加载联动看板…
        </div>
      ) : null}
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h3 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Table({
  headers,
  rows,
}: {
  headers: string[];
  rows: string[][];
}) {
  return (
    <div className="overflow-auto">
      <table className="min-w-full text-left text-xs">
        <thead className="bg-slate-50 text-slate-500 dark:bg-slate-950/50 dark:text-slate-400">
          <tr>
            {headers.map((h) => (
              <th key={h} className="whitespace-nowrap px-2 py-1.5 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.length > 0 ? (
            rows.map((row, idx) => (
              <tr key={`${row[0]}-${idx}`}>
                {row.map((col, ci) => (
                  <td key={`${idx}-${ci}`} className="whitespace-nowrap px-2 py-1.5 text-slate-700 dark:text-slate-300">
                    {col}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={headers.length}
                className="px-2 py-3 text-center text-slate-500 dark:text-slate-400"
              >
                暂无数据
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
