"use client";

import { useEffect, useState } from "react";

type Props = {
  currentRole: string | null;
  approvedPrice: number | null;
  status: string;
};

const APPROVAL_STEPS = [
  { role: "SALES_MANAGER", label: "销售经理", discount: "≤5%", color: "#10b981" },
  { role: "SALES_DIRECTOR", label: "销售总监", discount: "5-15%", color: "#3b82f6" },
  { role: "SALES_VP", label: "销售副总裁", discount: "15-20%", color: "#f59e0b" },
  { role: "GM", label: "总经理", discount: ">20%", color: "#ef4444" },
];

const ROLE_ORDER: Record<string, number> = {
  SALES_MANAGER: 0, SALES_DIRECTOR: 1, SALES_VP: 2, GM: 3, ADMIN: 3,
};

export function ApprovalFlowChart({ currentRole, approvedPrice, status }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 200); return () => clearTimeout(t); }, []);

  const isApproved = status === "APPROVED";
  const isPending = status === "PENDING_APPROVAL";
  const currentIdx = currentRole ? (ROLE_ORDER[currentRole] ?? -1) : -1;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {APPROVAL_STEPS.map((step, i) => {
          const isPast = isApproved || (isPending && i < currentIdx);
          const isCurrent = isPending && i === currentIdx;
          const isFuture = !isPast && !isCurrent;

          return (
            <div key={step.role} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-1" style={{ flex: 1 }}>
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold transition-all duration-500 ${
                    isPast ? "bg-emerald-500 text-white shadow-md" :
                    isCurrent ? "animate-pulse border-2 text-white shadow-lg" :
                    "border-2 border-slate-200 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-900"
                  }`}
                  style={{
                    ...(isCurrent ? { backgroundColor: step.color, borderColor: step.color } : {}),
                    transform: mounted && (isPast || isCurrent) ? "scale(1)" : "scale(0.8)",
                    opacity: mounted ? 1 : 0,
                    transitionDelay: `${i * 150}ms`,
                  }}
                >
                  {isPast ? "✓" : i + 1}
                </div>
                <span className={`text-[10px] font-semibold ${isCurrent ? "text-amber-700 dark:text-amber-400" : isPast ? "text-emerald-600" : "text-slate-400"}`}>
                  {step.label}
                </span>
                <span className="text-[9px] text-slate-400">{step.discount}</span>
              </div>
              {i < APPROVAL_STEPS.length - 1 && (
                <div className={`mx-1 h-0.5 flex-1 rounded transition-all duration-700 ${isPast ? "bg-emerald-400" : "bg-slate-200 dark:bg-slate-700"}`}
                  style={{ transitionDelay: `${i * 150 + 100}ms` }} />
              )}
            </div>
          );
        })}
      </div>
      {isApproved && approvedPrice != null && (
        <div className="rounded-lg bg-emerald-50 px-3 py-2 text-center text-sm font-bold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
          ✓ 审批通过 · 成交价 ¥{approvedPrice.toLocaleString("zh-CN")}
        </div>
      )}
    </div>
  );
}
