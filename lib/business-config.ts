/** 后台「系数与规则」只读展示用，与前台测算默认值一致 */

export const COEFFICIENT_DEFAULTS = {
  coeffCustomer: 1.15,
  coeffIndustry: 1.1,
  coeffRegion: 0.95,
  coeffProduct: 1.2,
  coeffLead: 1.08,
  coeffQty: 0.92,
} as const;

/** 与 lib/approval.ts 中 requiredRoleForDiscount 一致，用于后台只读展示 */
export const APPROVAL_DISCOUNT_BANDS = [
  { range: "0% – 5%（含）", role: "SDR", label: "Deal Desk · SDR" },
  { range: ">5% – 12%（含）", role: "AE", label: "Deal Desk · AE" },
  {
    range: ">12% – 20%（含）",
    role: "SALES_MANAGER",
    label: "Deal Desk · 销售经理",
  },
  { range: ">20%", role: "VP", label: "Deal Desk · VP / 特批" },
] as const;

export const SHUNT_RULE_SUMMARY = [
  "标准订阅包、低 ACV 单、普通客户",
  "相对建议价折扣 ≤5%",
  "按建议价测算赢单概率 ≥25%",
] as const;

export const VALUE_PROPOSITIONS = [
  {
    title: "分钟级订阅报价响应",
    desc: "订阅包拆解 + 多维系数 + 对标参考，一键生成建议价与赢单区间。",
  },
  {
    title: "Deal Desk 分层留痕",
    desc: "折扣穿透自动匹配 Deal Desk 链路，时间线记录议价与决策依据。",
  },
  {
    title: "客户价值罗盘与预警",
    desc: "客户价值 × 赢单概率四象限与对策矩阵，支撑管理层看结构、控风险。",
  },
  {
    title: "自动与协同分流",
    desc: "低复杂度标准订阅走自动通道，战略单强制销售教练协同。",
  },
] as const;
