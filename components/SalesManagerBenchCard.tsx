"use client";

import { getRolePlaybook } from "@/lib/role-playbook";

export function SalesManagerBenchCard() {
  const pb = getRolePlaybook("SALES_MANAGER");
  const items = pb.managerChecklist ?? [];

  return (
    <div className="space-y-3 rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/25">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-400">
          销售经理 · 上站清单
        </p>
        <p className="mt-1 text-xs leading-relaxed text-emerald-950/90 dark:text-emerald-100/90">
          下方已开放<strong>智能助手</strong>（qwen3.5 本地大模型），可直接解析商机语义并调整系数。请结合本清单自检后再提交审批。
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
