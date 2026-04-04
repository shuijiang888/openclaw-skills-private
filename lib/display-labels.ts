/** 界面展示用中文文案（内部编码仍保留英文枚举） */

export const PROJECT_STATUS_LABEL: Record<string, string> = {
  DRAFT: "草稿",
  PRICED: "已测算",
  PENDING_APPROVAL: "待 Deal Desk",
  APPROVED: "已核准",
};

export function projectStatusLabel(code: string): string {
  return PROJECT_STATUS_LABEL[code] ?? code;
}

export const CUSTOMER_TIER_LABEL: Record<string, string> = {
  NORMAL: "普通",
  KEY: "重点",
  STRATEGIC: "战略",
};

export function customerTierLabel(tier: string): string {
  return CUSTOMER_TIER_LABEL[tier] ?? tier;
}

export const DEMO_ROLE_LABEL: Record<string, string> = {
  SDR: "SDR",
  AE: "AE",
  PRE_SALES: "售前",
  SALES_MANAGER: "销售经理",
  VP: "VP",
};

export function demoRoleLabelForUi(code: string): string {
  return DEMO_ROLE_LABEL[code] ?? code;
}
