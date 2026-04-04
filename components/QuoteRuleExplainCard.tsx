"use client";

import {
  explainApprovalBands,
  explainCoefficientsVsDefaults,
  explainShuntRule,
  explainWinRateRule,
} from "@/lib/quote-rule-explain";

type Q = {
  coeffCustomer: number;
  coeffIndustry: number;
  coeffRegion: number;
  coeffProduct: number;
  coeffLead: number;
  coeffQty: number;
  computed: {
    discountPercentDisplay: number;
    requiredApproval: { label: string };
    shunt: { channel: "AUTO" | "COLLAB"; reasons: string[] };
    winRate: number;
  };
};

export function QuoteRuleExplainCard({ quote }: { quote: Q }) {
  const c = quote.computed;
  const approvalLines = explainApprovalBands(
    c.discountPercentDisplay,
    c.requiredApproval.label,
  );
  const shuntLines = explainShuntRule(c.shunt);
  const coeffLines = explainCoefficientsVsDefaults(quote);

  return (
    <section className="rounded-xl border border-sky-200/80 bg-sky-50/40 p-4 shadow-sm dark:border-sky-900/40 dark:bg-sky-950/25">
      <h2 className="text-sm font-semibold text-sky-950 dark:text-sky-200">
        Deal Desk 规则说明（B1 · 无模型）
      </h2>
      <p className="mt-1 text-[11px] leading-relaxed text-sky-900/80 dark:text-sky-300/80">
        下列文案由固定规则与当前单快照生成，便于对齐「为何是这一 Deal Desk 档 / 分流结果 / 系数偏离」；非大模型臆测。
      </p>

      <div className="mt-4 space-y-4 text-xs leading-relaxed text-sky-950 dark:text-sky-100">
        <div>
          <h3 className="font-medium text-sky-900 dark:text-sky-200">
            Deal Desk 分层（折扣区间）
          </h3>
          <ul className="mt-2 space-y-1.5 whitespace-pre-line text-sky-900/90 dark:text-sky-200/90">
            {approvalLines.map((line, i) => (
              <li key={`a-${i}`}>{line}</li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="font-medium text-sky-900 dark:text-sky-200">
            智能分流
          </h3>
          <ul className="mt-2 space-y-1 text-sky-900/90 dark:text-sky-200/90">
            {shuntLines.map((line, i) => (
              <li key={`s-${i}`}>{line}</li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="font-medium text-sky-900 dark:text-sky-200">
            系数相对默认值
          </h3>
          <ul className="mt-2 space-y-1 text-sky-900/90 dark:text-sky-200/90">
            {coeffLines.map((line, i) => (
              <li key={`c-${i}`}>{line}</li>
            ))}
          </ul>
        </div>

        <p className="border-t border-sky-200/60 pt-3 text-sky-900/85 dark:border-sky-800 dark:text-sky-300/85">
          {explainWinRateRule(c.winRate)}
        </p>
      </div>
    </section>
  );
}
