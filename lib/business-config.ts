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
  { range: "0% – 5%（含）", role: "SALES_MANAGER", label: "销售经理" },
  { range: ">5% – 15%（含）", role: "SALES_DIRECTOR", label: "销售总监" },
  { range: ">15% – 20%（含）", role: "SALES_VP", label: "销售副总裁" },
  { range: ">20%", role: "GM", label: "总经理 / 特批" },
] as const;

export const SHUNT_RULE_SUMMARY = [
  "标准品、小额订单、普通客户",
  "相对建议价折扣 ≤5%",
  "按建议价测算毛利率 ≥25%",
] as const;

export const VALUE_PROPOSITIONS = [
  {
    title: "分钟级报价响应",
    desc: "成本拆解 + 多维系数 + 对标参考，一键生成建议价与毛利区间。",
  },
  {
    title: "分层审批与留痕",
    desc: "折扣穿透自动匹配审批链，时间线记录议价与决策依据。",
  },
  {
    title: "盈利罗盘与预警",
    desc: "项目象限归类与对策矩阵，支撑老板看结构、控风险。",
  },
  {
    title: "自动与人机分流",
    desc: "低复杂度订单走自动通道，战略单强制人机协同。",
  },
] as const;
