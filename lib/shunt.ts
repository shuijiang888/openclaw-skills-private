export type ShuntResult = {
  channel: "AUTO" | "COLLAB";
  reasons: string[];
};

export function evaluateShunt(input: {
  isStandard: boolean;
  isSmallOrder: boolean;
  customerTier: string;
  discountRatio: number;
  grossMarginPercent: number;
}): ShuntResult {
  const reasons: string[] = [];
  let ok = true;
  if (!input.isStandard) {
    ok = false;
    reasons.push("非标准品 → 人机协同");
  }
  if (!input.isSmallOrder) {
    ok = false;
    reasons.push("规模非小额订单 → 人机协同");
  }
  if (input.customerTier === "STRATEGIC" || input.customerTier === "KEY") {
    ok = false;
    reasons.push("重点/战略客户 → 人机协同");
  }
  if (input.discountRatio > 0.05) {
    ok = false;
    reasons.push("折扣超过 5% → 人机协同");
  }
  if (input.grossMarginPercent < 25) {
    ok = false;
    reasons.push("毛利率低于 25% → 人机协同");
  }
  if (ok) {
    reasons.push("满足：标品 + 小额 + 普通客户 + 折扣≤5% + 毛利≥25%");
    reasons.push("可走自动报价通道（仍保留审计）");
  }
  return {
    channel: ok ? "AUTO" : "COLLAB",
    reasons,
  };
}
