"use client";

import { useState } from "react";

type Props = {
  onInsertText: (text: string) => void;
  disabled: boolean;
};

const COMPETITOR_SCENARIOS = [
  { label: "竞品低价", prompt: "客户反馈竞品报价低于我方约10%，如何应对？请从技术优势、交付保障、售后服务、长期成本四个角度给出回应策略和话术。" },
  { label: "客户砍价", prompt: "客户要求在当前报价基础上再降5%，否则考虑换供应商。请分析是否应该让步，给出谈判策略和底线建议。" },
  { label: "交期压力", prompt: "客户要求将交期从30天压缩到15天，需要加急生产。请评估对成本的影响，并建议交期系数和加急方案。" },
  { label: "账期延长", prompt: "客户要求将账期从30天延长至90天，请评估对现金流的影响，建议是否接受以及替代方案。" },
];

const OBJECTION_HANDLERS = [
  { label: "价格太高", response: "我理解价格是重要考量。我们的报价包含了完整的技术支持和质量保障——同等品质下，实际综合成本更优。我来帮您拆解一下成本明细……" },
  { label: "要对比多家", response: "完全理解，货比三家是专业采购的必要步骤。为方便您对比，我为您准备了一份详细的规格对照表和TCO分析，帮助决策更高效。" },
  { label: "需要请示领导", response: "理解，这个金额确实需要领导审批。我整理了一份一页纸的商务摘要，包含核心价值和ROI测算，方便您向领导汇报。" },
  { label: "现在不急", response: "了解，时机确实重要。不过目前我们有一个限时的交期优先通道，如果在本月内确认，可以确保优先排产和最优交期。" },
];

export function AiScenarioTools({ onInsertText, disabled }: Props) {
  const [expandedSection, setExpandedSection] = useState<"competitor" | "objection" | null>(null);

  return (
    <div className="space-y-3">
      {/* 竞品应对 */}
      <div className="rounded-xl border border-orange-200/70 bg-orange-50/30 dark:border-orange-900/40 dark:bg-orange-950/15">
        <button
          type="button"
          onClick={() => setExpandedSection(expandedSection === "competitor" ? null : "competitor")}
          className="flex w-full items-center justify-between px-3 py-2.5 text-left"
        >
          <span className="text-xs font-bold text-orange-800 dark:text-orange-300">🎯 竞品应对 & 谈判策略</span>
          <span className="text-xs text-orange-600">{expandedSection === "competitor" ? "收起" : "展开"}</span>
        </button>
        {expandedSection === "competitor" && (
          <div className="border-t border-orange-200/50 px-3 py-2 dark:border-orange-900/30">
            <div className="grid grid-cols-2 gap-1.5">
              {COMPETITOR_SCENARIOS.map(s => (
                <button key={s.label} type="button" disabled={disabled}
                  onClick={() => onInsertText(s.prompt)}
                  className="rounded-lg border border-orange-200 bg-white px-2 py-1.5 text-left text-[10px] font-medium text-orange-800 transition hover:bg-orange-50 disabled:opacity-50 dark:border-orange-800 dark:bg-orange-950/30 dark:text-orange-300">
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 异议处理 */}
      <div className="rounded-xl border border-violet-200/70 bg-violet-50/30 dark:border-violet-900/40 dark:bg-violet-950/15">
        <button
          type="button"
          onClick={() => setExpandedSection(expandedSection === "objection" ? null : "objection")}
          className="flex w-full items-center justify-between px-3 py-2.5 text-left"
        >
          <span className="text-xs font-bold text-violet-800 dark:text-violet-300">💬 客户异议处理话术库</span>
          <span className="text-xs text-violet-600">{expandedSection === "objection" ? "收起" : "展开"}</span>
        </button>
        {expandedSection === "objection" && (
          <div className="border-t border-violet-200/50 px-3 py-2 space-y-2 dark:border-violet-900/30">
            {OBJECTION_HANDLERS.map(o => (
              <div key={o.label} className="rounded-lg border border-violet-100 bg-white p-2 dark:border-violet-800 dark:bg-violet-950/20">
                <p className="text-[10px] font-bold text-violet-700 dark:text-violet-300">客户说："{o.label}"</p>
                <p className="mt-1 text-[10px] leading-relaxed text-slate-600 dark:text-slate-400">{o.response}</p>
                <button type="button" disabled={disabled}
                  onClick={() => onInsertText(`客户异议："${o.label}"。请基于当前报价数据，生成更具针对性的回应话术。`)}
                  className="mt-1 text-[9px] font-semibold text-violet-600 hover:underline disabled:opacity-50 dark:text-violet-400">
                  用 AI 生成个性化话术 →
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
