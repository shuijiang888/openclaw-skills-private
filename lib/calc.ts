export function totalCost(parts: {
  material: number;
  labor: number;
  overhead: number;
  period: number;
}): number {
  return (
    Number(parts.material) +
    Number(parts.labor) +
    Number(parts.overhead) +
    Number(parts.period)
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
  return (
    c.coeffCustomer *
    c.coeffIndustry *
    c.coeffRegion *
    c.coeffProduct *
    c.coeffLead *
    c.coeffQty
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
  if (!offered || suggested <= 0) return 0;
  return Math.max(0, 1 - offered / suggested);
}

export function grossMarginPercent(price: number, cost: number): number {
  if (price <= 0) return 0;
  return Math.round(((price - cost) / price) * 1000) / 10;
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
  const v =
    scores.wsPrice * WIN_WEIGHTS.price +
    scores.wsRelation * WIN_WEIGHTS.relation +
    scores.wsDelivery * WIN_WEIGHTS.delivery +
    scores.wsTech * WIN_WEIGHTS.tech +
    scores.wsPayment * WIN_WEIGHTS.payment;
  return Math.min(100, Math.max(0, Math.round(v * 10) / 10));
}

export function buildAiSuggestion(input: {
  suggestedPrice: number;
  cost: number;
  customerTier: string;
}): string {
  const m = grossMarginPercent(input.suggestedPrice, input.cost);
  const lines = [
    `当前建议价对应客户价值率约 ${m.toFixed(1)}%。`,
    input.customerTier === "STRATEGIC"
      ? "高价值客户：可在 Deal Desk 说明中强调续费扩容与长期价值。"
      : "价格敏感客户：建议准备不超过 5% 的让利预案，并同步价值叙事。",
    "如对历史价有上行，请在销售教练建议中说明订阅范围与服务级别变化依据。",
  ];
  return lines.join("\n");
}
