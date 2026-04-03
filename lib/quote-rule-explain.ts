import {
  APPROVAL_DISCOUNT_BANDS,
  COEFFICIENT_DEFAULTS,
  SHUNT_RULE_SUMMARY,
} from "@/lib/business-config";
import type { ShuntResult } from "@/lib/shunt";

const COEFF_LABELS: Record<string, string> = {
  coeffCustomer: "客户",
  coeffIndustry: "行业",
  coeffRegion: "区域",
  coeffProduct: "产品",
  coeffLead: "交期",
  coeffQty: "批量",
};

/** B1：审批档规则说明（与 `requiredRoleForDiscount` / 后台展示一致） */
export function explainApprovalBands(
  discountPercentDisplay: number,
  matchedLabel: string,
): string[] {
  const d = discountPercentDisplay;
  const lines: string[] = [
    `当前展示折扣（相对建议价）约 ${d}%。系统按区间匹配审批责任角色（演示口径，与「系数与规则」页一致）。`,
    `本单建议审批链：${matchedLabel}。`,
    "区间对照：",
  ];
  for (const b of APPROVAL_DISCOUNT_BANDS) {
    lines.push(`· ${b.range} → ${b.label}`);
  }
  return lines;
}

/** B1：分流规则摘要 + 本单命中原因 */
export function explainShuntRule(shunt: ShuntResult): string[] {
  const head =
    shunt.channel === "AUTO"
      ? "当前判定为「自动报价通道」（演示规则，仍保留审计与时间线）。"
      : "当前判定为「人机协同通道」（需具备权限的同事复核后再推进）。";
  const body = ["本单命中条件：", ...shunt.reasons.map((r) => `· ${r}`)];
  const tail = [
    "自动通道的**同时满足**条件摘要（与 `lib/shunt.ts` 一致）：",
    ...SHUNT_RULE_SUMMARY.map((s) => `· ${s}`),
  ];
  return [head, ...body, ...tail];
}

/** B1：系数相对演示默认值偏高/偏低 */
export function explainCoefficientsVsDefaults(coeffs: {
  coeffCustomer: number;
  coeffIndustry: number;
  coeffRegion: number;
  coeffProduct: number;
  coeffLead: number;
  coeffQty: number;
}): string[] {
  const keys = [
    "coeffCustomer",
    "coeffIndustry",
    "coeffRegion",
    "coeffProduct",
    "coeffLead",
    "coeffQty",
  ] as const;
  const diffs: string[] = [];
  for (const k of keys) {
    const cur = coeffs[k];
    const def = COEFFICIENT_DEFAULTS[k];
    if (Math.abs(cur - def) < 1e-6) continue;
    const pct = Math.round((cur / def - 1) * 1000) / 10;
    const dir = pct > 0 ? "高于" : "低于";
    diffs.push(
      `· ${COEFF_LABELS[k] ?? k} 系数 ${cur}，${dir}演示默认值 ${def}（约 ${pct > 0 ? "+" : ""}${pct}%）`,
    );
  }
  if (diffs.length === 0) {
    return [
      "六项报价系数均与演示默认值一致（见管理后台「系数与规则」中的默认报价系数）。",
    ];
  }
  return [
    "相对演示默认系数的变化会影响连乘系数与建议价（演示口径）：",
    ...diffs,
  ];
}

export function explainWinRateRule(winRate: number): string {
  return `综合胜率（规则加权）为 ${winRate}%，由价格竞争力、客情、交付、技术匹配、账期等滑杆共同驱动；与分流、审批链相互独立，仅作商机判断参考。`;
}
