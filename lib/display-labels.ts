/** 界面展示用中文文案（内部编码仍保留英文枚举） */

export const PROJECT_STATUS_LABEL: Record<string, string> = {
  DRAFT: "草稿",
  PRICED: "已测算",
  PENDING_APPROVAL: "待审批",
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
  SALES_MANAGER: "销售经理",
  SALES_DIRECTOR: "销售总监",
  SALES_VP: "销售副总裁",
  GM: "总经理",
  ADMIN: "管理员",
};

export function demoRoleLabelForUi(code: string): string {
  return DEMO_ROLE_LABEL[code] ?? code;
}
