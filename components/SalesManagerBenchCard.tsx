"use client";

import { getRolePlaybook } from "@/lib/role-playbook";

export function SalesManagerBenchCard() {
  const pb = getRolePlaybook("SDR");
  const items = pb.managerChecklist ?? [];

  return (
    <div className="space-y-3 rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/25">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-400">
          SDR · 上站清单
        </p>
        <p className="mt-1 text-xs leading-relaxed text-emerald-950/90 dark:text-emerald-100/90">
          本档可使用左侧完整测算与<strong>提交 Deal Desk</strong>。需要销售教练解析系数时，请将右上角切换为
          <strong>AE/售前及以上</strong>，解析结果仍须结合本清单自检。
        </p>
      </div>
      <ul className="list-inside list-disc space-y-1.5 text-[11px] text-emerald-900/95 dark:text-emerald-100/85">
        {items.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}
