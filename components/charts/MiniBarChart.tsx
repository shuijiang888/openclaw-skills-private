"use client";

import { useEffect, useState } from "react";

type BarData = { label: string; value: number; color?: string };

type Props = {
  data: BarData[];
  height?: number;
  showValues?: boolean;
};

export function MiniBarChart({ data, height = 120, showValues = true }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 200); return () => clearTimeout(t); }, []);

  const maxVal = Math.max(...data.map(d => d.value), 1);

  return (
    <div className="flex items-end gap-1.5" style={{ height }}>
      {data.map((d, i) => {
        const hPct = (d.value / maxVal) * 100;
        return (
          <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
            {showValues && (
              <span className="text-[9px] font-bold tabular-nums text-slate-600 dark:text-slate-400">
                {d.value > 0 ? d.value : ""}
              </span>
            )}
            <div className="w-full overflow-hidden rounded-t-md bg-slate-100 dark:bg-slate-800" style={{ height: height - 30 }}>
              <div
                className="w-full rounded-t-md transition-all duration-600"
                style={{
                  height: mounted ? `${hPct}%` : "0%",
                  backgroundColor: d.color ?? "#d97706",
                  transitionDelay: `${i * 80}ms`,
                  marginTop: mounted ? `${100 - hPct}%` : "100%",
                }}
              />
            </div>
            <span className="text-[9px] text-slate-500 truncate max-w-full">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}
