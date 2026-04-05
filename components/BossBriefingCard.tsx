"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { BossBriefingDTO } from "@/lib/boss-briefing";
import { PROFIT_DATA_CHANGED } from "@/lib/profit-data-events";
import { withClientBasePath } from "@/lib/client-url";

function BriefingInner({ data }: { data: BossBriefingDTO }) {
  const m = data.metrics;
  return (
    <>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "风险池（毛利<15%）", value: String(m.lowMarginQuoteCount), href: "/projects", color: "text-red-600" },
          { label: "自动通道占比", value: `${m.autoChannelEligiblePct}%`, href: "/projects", color: "text-emerald-600" },
          { label: "待审批", value: String(m.pendingApprovalCount), href: "/projects?focus=my-queue", color: "text-amber-600" },
          { label: "TOP1 客户占比", value: `${m.topCustomerConcentrationPct}%`, href: "/console/customers", color: "text-blue-600" },
        ].map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="card-hover rounded-lg border border-slate-200/90 bg-white/90 px-3 py-2 transition hover:border-amber-300 hover:shadow dark:border-slate-700 dark:bg-slate-950/40 dark:hover:border-amber-800"
          >
            <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
              {item.label}
            </div>
            <div className={`mt-0.5 text-lg font-bold tabular-nums ${item.color}`}>
              {item.value}
            </div>
            <div className="mt-0.5 text-[9px] text-amber-600 dark:text-amber-400">查看详情 →</div>
          </Link>
        ))}
      </div>
      <ul className="mt-4 space-y-2 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
        {data.narrative.bullets.map((b) => (
          <li key={b.slice(0, 48)} className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
            <span>{b}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 rounded-xl border border-amber-200/80 bg-amber-50/50 px-3 py-3 dark:border-amber-900/40 dark:bg-amber-950/25">
        <p className="text-[11px] font-semibold text-amber-950 dark:text-amber-200">
          建议本周拍板（试点叙事模板）
        </p>
        <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-[11px] text-amber-950/90 dark:text-amber-100/85">
          {data.narrative.decisions.map((d) => (
            <li key={d.slice(0, 40)}>{d}</li>
          ))}
        </ol>
      </div>
      <p className="mt-3 text-[10px] leading-relaxed text-slate-500 dark:text-slate-500">
        {data.disclaimer}
      </p>
      <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500">
        <Link
          href="/dashboard"
          className="font-medium text-amber-800 underline dark:text-amber-400"
        >
          经营看板
        </Link>
        <Link
          href="/compass"
          className="font-medium text-amber-800 underline dark:text-amber-400"
        >
          盈利罗盘
        </Link>
        <span className="tabular-nums text-slate-400">
          生成 {new Date(data.generatedAt).toLocaleString("zh-CN")}
        </span>
      </p>
    </>
  );
}

/**
 * B2：`data` 由服务端传入时不发请求；省略时由客户端请求
 * `/api/dashboard/boss-briefing`。
 */
export function BossBriefingCard({ data: serverData }: { data?: BossBriefingDTO }) {
  const [clientData, setClientData] = useState<BossBriefingDTO | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const fetchBriefing = useCallback(() => {
    if (serverData) return;
    setErr(null);
    void fetch(withClientBasePath("/api/dashboard/boss-briefing"))
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<BossBriefingDTO>;
      })
      .then(setClientData)
      .catch(() => setErr("简报加载失败"));
  }, [serverData]);

  useEffect(() => {
    fetchBriefing();
  }, [fetchBriefing]);

  useEffect(() => {
    if (serverData) return;
    const onSync = () => fetchBriefing();
    window.addEventListener(PROFIT_DATA_CHANGED, onSync);
    return () => window.removeEventListener(PROFIT_DATA_CHANGED, onSync);
  }, [serverData, fetchBriefing]);

  const data = serverData ?? clientData;

  return (
    <section className="rounded-2xl border border-slate-200/90 bg-gradient-to-br from-slate-50/95 via-white to-amber-50/40 p-5 shadow-sm dark:border-slate-800 dark:from-slate-950/80 dark:via-slate-900 dark:to-amber-950/20">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold tracking-wide text-amber-800 dark:text-amber-400">
            B2 · 组合指标
          </p>
          <h2 className="mt-0.5 text-base font-bold text-slate-900 dark:text-white">
            老板简报
          </h2>
        </div>
      </div>
      {err ? (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">{err}</p>
      ) : !data ? (
        <p className="mt-4 text-sm text-slate-500">加载简报…</p>
      ) : (
        <BriefingInner data={data} />
      )}
    </section>
  );
}
