/**
 * 系数描述映射——根据项目上下文为每个系数生成说明文案
 * 对应原始需求图2：智能系数叠加引擎
 */

export type CoeffDescription = {
  key: string;
  label: string;
  value: number;
  tag: string;
  impactPct: string;
  reason: string;
};

const CUSTOMER_TIER_DESC: Record<string, { tag: string; reason: string }> = {
  STRATEGIC: { tag: "战略客户", reason: "长期合作/基座大" },
  KEY: { tag: "重点客户", reason: "合作稳定/潜力高" },
  NORMAL: { tag: "普通客户", reason: "标准条款" },
};

export function describeCoefficients(ctx: {
  coeffCustomer: number;
  coeffIndustry: number;
  coeffRegion: number;
  coeffProduct: number;
  coeffLead: number;
  coeffQty: number;
  customerTier?: string;
  productName?: string;
  leadDays?: number;
  quantity?: number;
  isStandard?: boolean;
}): CoeffDescription[] {
  const pct = (v: number) => {
    const p = Math.round((v - 1) * 100);
    return p >= 0 ? `+${p}%` : `${p}%`;
  };

  const tierInfo = CUSTOMER_TIER_DESC[ctx.customerTier ?? "NORMAL"] ?? CUSTOMER_TIER_DESC.NORMAL;

  const productTag = ctx.productName
    ? ctx.productName.length > 6
      ? ctx.productName.slice(0, 6)
      : ctx.productName
    : "标准产品";

  const leadTag = (ctx.leadDays ?? 15) <= 7
    ? "加急订单"
    : (ctx.leadDays ?? 15) <= 15
      ? "常规交期"
      : "宽裕交期";

  const leadReason = (ctx.leadDays ?? 15) <= 7
    ? `${ctx.leadDays ?? 7}天交付`
    : `${ctx.leadDays ?? 15}天交付`;

  const qtyTag = (ctx.quantity ?? 1000) >= 10000
    ? "大批量"
    : (ctx.quantity ?? 1000) >= 1000
      ? "中批量"
      : "小批量";

  const qtyReason = (ctx.quantity ?? 1000) >= 10000
    ? "规模效应"
    : (ctx.quantity ?? 1000) >= 1000
      ? "标准批量"
      : "小额订单";

  return [
    {
      key: "coeffCustomer",
      label: "客户系数",
      value: ctx.coeffCustomer,
      tag: tierInfo.tag,
      impactPct: pct(ctx.coeffCustomer),
      reason: tierInfo.reason,
    },
    {
      key: "coeffIndustry",
      label: "行业系数",
      value: ctx.coeffIndustry,
      tag: "行业适配",
      impactPct: pct(ctx.coeffIndustry),
      reason: "景气行情/需求弹性",
    },
    {
      key: "coeffRegion",
      label: "区域系数",
      value: ctx.coeffRegion,
      tag: "区域调节",
      impactPct: pct(ctx.coeffRegion),
      reason: "物流/属地成本",
    },
    {
      key: "coeffProduct",
      label: "产品系数",
      value: ctx.coeffProduct,
      tag: productTag,
      impactPct: pct(ctx.coeffProduct),
      reason: ctx.isStandard ? "标准品" : "技术门槛高",
    },
    {
      key: "coeffLead",
      label: "交期系数",
      value: ctx.coeffLead,
      tag: leadTag,
      impactPct: pct(ctx.coeffLead),
      reason: leadReason,
    },
    {
      key: "coeffQty",
      label: "批量系数",
      value: ctx.coeffQty,
      tag: qtyTag,
      impactPct: pct(ctx.coeffQty),
      reason: qtyReason,
    },
  ];
}
