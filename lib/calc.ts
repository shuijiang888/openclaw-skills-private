export function totalCost(parts: {
  material: number;
  labor: number;
  overhead: number;
  period: number;
}): number {
  const toFinite = (v: number): number => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  return (
    toFinite(parts.material) +
    toFinite(parts.labor) +
    toFinite(parts.overhead) +
    toFinite(parts.period)
  );
}

export function coefficientProduct(c: {
  material: number;
  labor: number;
  overhead: number;
  period: number;
  coeffCustomer: number;
  coeffIndustry: number;
  coeffRegion: number;
  coeffProduct: number;
  coeffLead: number;
  coeffQty: number;
}): number {
  const toFinite = (v: number): number => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  return (
    toFinite(c.coeffCustomer) *
    toFinite(c.coeffIndustry) *
    toFinite(c.coeffRegion) *
    toFinite(c.coeffProduct) *
    toFinite(c.coeffLead) *
    toFinite(c.coeffQty)
  );
}

export function suggestedPriceFromCosts(c: {
  material: number;
  labor: number;
  overhead: number;
  period: number;
  coeffCustomer: number;
  coeffIndustry: number;
  coeffRegion: number;
  coeffProduct: number;
  coeffLead: number;
  coeffQty: number;
}): number {
  const cost = totalCost(c);
  const k = coefficientProduct(c);
  return Math.round(cost * k * 100) / 100;
}

export function discountPercent(
  suggested: number,
  offered: number | null | undefined,
): number {
  const suggestedNum = Number(suggested);
  const offeredNum = Number(offered);
  if (!Number.isFinite(suggestedNum) || suggestedNum <= 0) return 0;
  if (!Number.isFinite(offeredNum) || offeredNum <= 0) return 0;
  const ratio = 1 - offeredNum / suggestedNum;
  return Number.isFinite(ratio) ? Math.max(0, ratio) : 0;
}

export function grossMarginPercent(price: number, cost: number): number {
  const priceNum = Number(price);
  const costNum = Number(cost);
  if (!Number.isFinite(priceNum) || priceNum <= 0) return 0;
  if (!Number.isFinite(costNum)) return 0;
  const margin = ((priceNum - costNum) / priceNum) * 100;
  return Number.isFinite(margin) ? Math.round(margin * 10) / 10 : 0;
}

const WIN_WEIGHTS = {
  price: 0.28,
  relation: 0.22,
  delivery: 0.18,
  tech: 0.2,
  payment: 0.12,
};

export function winRatePercent(scores: {
  wsPrice: number;
  wsRelation: number;
  wsDelivery: number;
  wsTech: number;
  wsPayment: number;
}): number {
  const toFinite = (v: number): number => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  const v =
    toFinite(scores.wsPrice) * WIN_WEIGHTS.price +
    toFinite(scores.wsRelation) * WIN_WEIGHTS.relation +
    toFinite(scores.wsDelivery) * WIN_WEIGHTS.delivery +
    toFinite(scores.wsTech) * WIN_WEIGHTS.tech +
    toFinite(scores.wsPayment) * WIN_WEIGHTS.payment;
  if (!Number.isFinite(v)) return 0;
  return Math.min(100, Math.max(0, Math.round(v * 10) / 10));
}

export function buildAiSuggestion(input: {
  suggestedPrice: number;
  cost: number;
  customerTier: string;
}): string {
  const m = grossMarginPercent(input.suggestedPrice, input.cost);
  const lines = [
    `当前建议价对应毛利率约 ${m.toFixed(1)}%。`,
    input.customerTier === "STRATEGIC"
      ? "战略客户：可在审批说明中强调长期合作与技术服务。"
      : "价格敏感客户：建议准备不超过 5% 的议价预案，并同步技术升级叙事。",
    "如对历史价有上行，请在拜访中说明工艺/材料变更依据。",
  ];
  return lines.join("\n");
}
