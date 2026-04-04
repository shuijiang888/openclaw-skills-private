/** 纯文本报价摘要，便于复制到微信 / 邮件 / 纪要 */

const COEFF_LABEL: Record<string, string> = {
  coeffCustomer: "客户系数",
  coeffIndustry: "行业系数",
  coeffRegion: "区域系数",
  coeffProduct: "产品系数",
  coeffLead: "交期系数",
  coeffQty: "批量系数",
};

export function buildQuoteSummaryText(args: {
  projectName: string;
  productName: string;
  customerName: string;
  customerTierLabel: string;
  projectStatusLabel: string;
  quantity: number;
  leadDays: number;
  suggestedPrice: number;
  counterPrice: number | null;
  grossMarginAtSuggest: number;
  grossMarginAtOffer: number;
  discountPercentDisplay: number;
  winRate: number;
  shuntChannel: string;
  shuntReasons: string[];
  requiredApprovalLabel: string;
  coeffEntries: { key: string; value: number }[];
  aiSuggestion: string;
}): string {
  const parts = [
    `【报价摘要】${args.projectName}`,
    `客户：${args.customerName}（${args.customerTierLabel}）`,
    `状态：${args.projectStatusLabel}｜产品：${args.productName || "—"}`,
    `数量 ${args.quantity}｜交期 ${args.leadDays} 天`,
    `建议价 ¥${args.suggestedPrice.toLocaleString("zh-CN")}｜建议客户价值率 ${args.grossMarginAtSuggest}%`,
  ];
  if (args.counterPrice != null) {
    parts.push(
      `还价 ¥${args.counterPrice.toLocaleString("zh-CN")}｜折扣约 ${args.discountPercentDisplay}%｜还价后客户价值率 ${args.grossMarginAtOffer}%`,
    );
  }
  parts.push(`综合胜率（规则） ${args.winRate}%`);
  parts.push(`分流：${args.shuntChannel}`);
  if (args.shuntReasons.length) {
    parts.push(`分流说明：${args.shuntReasons.join("；")}`);
  }
  parts.push(`建议 Deal Desk：${args.requiredApprovalLabel}`);
  const coeffLine = args.coeffEntries
    .map(({ key, value }) => `${COEFF_LABEL[key] ?? key} ${value}`)
    .join("；");
  parts.push(`系数：${coeffLine}`);
  parts.push("");
  parts.push("【系统建议】");
  parts.push(args.aiSuggestion.trim() || "—");
  parts.push("");
  parts.push(
    `—— 由纷享销客 CRM 插件生成 · ${new Date().toLocaleString("zh-CN")}`,
  );
  return parts.join("\n");
}
