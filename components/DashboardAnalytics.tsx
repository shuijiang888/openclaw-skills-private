"use client";

import { useEffect, useState } from "react";
import { apiUrl } from "@/lib/client-base-path";
import { SalesFunnelChart } from "@/components/charts/SalesFunnelChart";
import { MiniBarChart } from "@/components/charts/MiniBarChart";
import { DonutChart } from "@/components/charts/DonutChart";

type AnalyticsData = {
  funnel: { draft: number; priced: number; pending: number; approved: number };
  customerConcentration: { name: string; count: number }[];
  totalProjects: number;
};

export function DashboardAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    void fetch(apiUrl("/api/projects"))
      .then(r => r.json())
      .then((projects: { status: string; customer?: { name: string }; customerId: string }[]) => {
        const draft = projects.filter(p => p.status === "DRAFT").length;
        const priced = projects.filter(p => p.status === "PRICED").length;
        const pending = projects.filter(p => p.status === "PENDING_APPROVAL").length;
        const approved = projects.filter(p => p.status === "APPROVED").length;

        const customerCounts: Record<string, number> = {};
        for (const p of projects) {
          const name = (p.customer as { name: string } | undefined)?.name ?? p.customerId;
          customerCounts[name] = (customerCounts[name] ?? 0) + 1;
        }
        const customerConcentration = Object.entries(customerCounts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 8);

        setData({
          funnel: { draft, priced, pending, approved },
          customerConcentration,
          totalProjects: projects.length,
        });
      })
      .catch(() => {});
  }, []);

  if (!data) return null;

  const funnelStages = [
    { label: "询价/草稿", count: data.funnel.draft, color: "#94a3b8" },
    { label: "已测算", count: data.funnel.priced, color: "#3b82f6" },
    { label: "待审批", count: data.funnel.pending, color: "#f59e0b" },
    { label: "已成交", count: data.funnel.approved, color: "#10b981" },
  ];

  const topColors = ["#d97706", "#3b82f6", "#10b981", "#ef4444", "#8b5cf6", "#0ea5e9", "#f43f5e", "#6366f1"];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {/* 销售漏斗 */}
      <section className="card-hover rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:col-span-1">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">销售漏斗</h3>
        <p className="mt-0.5 text-[10px] text-slate-500">从询价到成交的转化率</p>
        <div className="mt-4">
          <SalesFunnelChart stages={funnelStages} />
        </div>
      </section>

      {/* 客户集中度 */}
      <section className="card-hover rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:col-span-1">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">客户集中度 Top 8</h3>
        <p className="mt-0.5 text-[10px] text-slate-500">项目数分布，警惕过度依赖单一客户</p>
        <div className="mt-4">
          <MiniBarChart
            data={data.customerConcentration.map((c, i) => ({
              label: c.name.length > 4 ? c.name.slice(0, 4) : c.name,
              value: c.count,
              color: topColors[i % topColors.length],
            }))}
            height={140}
          />
        </div>
      </section>

      {/* 项目状态分布 */}
      <section className="card-hover rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:col-span-2 lg:col-span-1">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">项目状态分布</h3>
        <p className="mt-0.5 text-[10px] text-slate-500">当前全库项目各阶段占比</p>
        <div className="mt-4">
          <DonutChart
            segments={[
              { label: "草稿", value: data.funnel.draft, color: "#94a3b8" },
              { label: "已测算", value: data.funnel.priced, color: "#3b82f6" },
              { label: "待审批", value: data.funnel.pending, color: "#f59e0b" },
              { label: "已成交", value: data.funnel.approved, color: "#10b981" },
            ]}
            size={160}
            centerValue={String(data.totalProjects)}
            centerLabel="项目总数"
          />
        </div>
      </section>
    </div>
  );
}
