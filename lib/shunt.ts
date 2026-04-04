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
    reasons.push("非标准订阅包 → Deal Desk 协同");
  }
  if (!input.isSmallOrder) {
    ok = false;
    reasons.push("席位规模超出小单阈值 → Deal Desk 协同");
  }
  if (input.customerTier === "STRATEGIC" || input.customerTier === "KEY") {
    ok = false;
    reasons.push("重点/战略客户 → 销售教练协同");
  }
  if (input.discountRatio > 0.05) {
    ok = false;
    reasons.push("折扣超过 5% → 进入 Deal Desk");
  }
  if (input.grossMarginPercent < 25) {
    ok = false;
    reasons.push("客户价值低于 25% → 销售教练协同");
  }
  if (ok) {
    reasons.push("满足：标准订阅包 + 小单 + 普通客户 + 折扣≤5% + 客户价值≥25%");
    reasons.push("可走自动报价通道（仍保留 Deal Desk 审计）");
  }
  return {
    channel: ok ? "AUTO" : "COLLAB",
    reasons,
  };
}
