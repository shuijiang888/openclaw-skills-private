"use client";

import { useEffect, useState } from "react";
import { apiUrl } from "@/lib/client-base-path";

type CustomerProfile = {
  name: string;
  tier: string;
  arDays: number;
  projectCount: number;
  totalQuoted: number;
  pendingCount: number;
  approvedCount: number;
};

const TIER_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  STRATEGIC: { label: "战略", color: "text-amber-800", bg: "bg-amber-100 dark:bg-amber-900" },
  KEY: { label: "重点", color: "text-blue-800", bg: "bg-blue-100 dark:bg-blue-900" },
  NORMAL: { label: "普通", color: "text-slate-600", bg: "bg-slate-100 dark:bg-slate-800" },
};

export function CustomerProfileCard({ customerId, customerName }: { customerId: string; customerName: string }) {
  const [profile, setProfile] = useState<CustomerProfile | null>(null);

  useEffect(() => {
    if (!customerId && !customerName) return;

    void Promise.all([
      fetch(apiUrl("/api/customers")).then(r => r.ok ? r.json() : []),
      fetch(apiUrl("/api/projects")).then(r => r.ok ? r.json() : []),
    ])
      .then(([customers, projects]: [
        { id: string; name: string; tier: string; arDays: number }[],
        { customerId: string; status: string; quote?: { suggestedPrice: number } | null }[],
      ]) => {
        const c = customers.find(x => x.id === customerId) ?? customers.find(x => x.name === customerName);
        if (!c) return;

        const myProjects = projects.filter(p => p.customerId === c.id);
        const totalQuoted = myProjects.reduce((s, p) => s + (p.quote?.suggestedPrice ?? 0), 0);

        setProfile({
          name: c.name,
          tier: c.tier,
          arDays: c.arDays,
          projectCount: myProjects.length,
          totalQuoted: Math.round(totalQuoted),
          pendingCount: myProjects.filter(p => p.status === "PENDING_APPROVAL").length,
          approvedCount: myProjects.filter(p => p.status === "APPROVED").length,
        });
      })
      .catch(() => {});
  }, [customerId, customerName]);

  if (!profile) return null;

  const tc = TIER_CONFIG[profile.tier] ?? TIER_CONFIG.NORMAL;

  return (
    <div className="rounded-xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/50 p-4 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:to-slate-950">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500">客户画像</p>
          <p className="mt-0.5 text-base font-bold text-slate-900 dark:text-white">{profile.name}</p>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${tc.color} ${tc.bg}`}>{tc.label}客户</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: "项目数", value: String(profile.projectCount), color: "text-slate-900" },
          { label: "报价总额", value: `¥${(profile.totalQuoted / 10000).toFixed(1)}万`, color: "text-amber-600" },
          { label: "待审批", value: String(profile.pendingCount), color: "text-amber-600" },
          { label: "已成交", value: String(profile.approvedCount), color: "text-emerald-600" },
        ].map(m => (
          <div key={m.label} className="rounded-lg bg-slate-50 px-2 py-1.5 dark:bg-slate-800/50">
            <p className="text-[10px] text-slate-500">{m.label}</p>
            <p className={`text-sm font-bold tabular-nums ${m.color} dark:text-white`}>{m.value}</p>
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-3 text-[10px] text-slate-500">
        <span>账期 {profile.arDays} 天</span>
        <span>·</span>
        <span>评级 {tc.label}</span>
      </div>
    </div>
  );
}
