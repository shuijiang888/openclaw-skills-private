"use client";

import { useEffect, useState } from "react";

type FunnelStage = { label: string; count: number; color: string };

type Props = { stages: FunnelStage[] };

export function SalesFunnelChart({ stages }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 200); return () => clearTimeout(t); }, []);

  const maxCount = Math.max(...stages.map(s => s.count), 1);

  return (
    <div className="space-y-2">
      {stages.map((stage, i) => {
        const widthPct = (stage.count / maxCount) * 100;
        const conversionPct = i > 0 && stages[i - 1].count > 0
          ? Math.round((stage.count / stages[i - 1].count) * 100) : null;
        return (
          <div key={stage.label}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-medium text-slate-700 dark:text-slate-300">{stage.label}</span>
              <span className="flex items-center gap-2">
                {conversionPct !== null && (
                  <span className="text-[10px] text-slate-400">转化 {conversionPct}%</span>
                )}
                <span className="font-bold tabular-nums text-slate-900 dark:text-white">{stage.count}</span>
              </span>
            </div>
            <div className="h-8 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
              <div
                className="flex h-full items-center justify-center rounded-lg text-xs font-bold text-white transition-all duration-700"
                style={{
                  width: mounted ? `${Math.max(widthPct, 8)}%` : "0%",
                  backgroundColor: stage.color,
                  transitionDelay: `${i * 150}ms`,
                }}
              >
                {widthPct > 20 ? stage.count : ""}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
