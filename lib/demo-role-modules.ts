import type { DemoRole } from "./approval";

const ALL: DemoRole[] = [
  "SDR",
  "AE",
  "PRE_SALES",
  "SALES_MANAGER",
  "VP",
];
/** SDR 以外：可看战略与路线 */
const NON_SDR: DemoRole[] = ["AE", "PRE_SALES", "SALES_MANAGER", "VP"];
/** 管控台：销售经理 + VP */
const BACKOFFICE: DemoRole[] = ["SALES_MANAGER", "VP"];

export const DEMO_NAV_LINKS = [
  { href: "/", label: "门户", roles: ALL },
  { href: "/about", label: "价值主张", roles: ALL },
  { href: "/strategy", label: "战略全文", roles: NON_SDR },
  { href: "/dashboard", label: "工作台", roles: ALL },
  { href: "/projects", label: "项目", roles: ALL },
  { href: "/projects/new", label: "新建商机", roles: ALL },
  { href: "/compass", label: "客户价值罗盘", roles: ALL },
  { href: "/roadmap", label: "路线图", roles: NON_SDR },
  { href: "/console", label: "管理后台", roles: BACKOFFICE },
] as const;

export const DEMO_CONSOLE_SIDEBAR_LINKS = [
  { href: "/console", label: "控制台", roles: BACKOFFICE },
  { href: "/console/pipeline", label: "项目与 Deal Desk", roles: BACKOFFICE },
  { href: "/console/customers", label: "主数据 · 客户", roles: BACKOFFICE },
  { href: "/console/readiness", label: "落地准备", roles: BACKOFFICE },
  {
    href: "/console/rules",
    label: "系数与规则",
    roles: ["VP"] as DemoRole[],
  },
  {
    href: "/console/agent-audit",
    label: "智能体审计",
    roles: ["VP"] as DemoRole[],
  },
] as const;

export function filterNavLinksForRole(role: DemoRole) {
  return DEMO_NAV_LINKS.filter((l) =>
    (l.roles as readonly DemoRole[]).includes(role),
  );
}

export function filterConsoleSidebarForRole(role: DemoRole) {
  return DEMO_CONSOLE_SIDEBAR_LINKS.filter((l) =>
    (l.roles as readonly DemoRole[]).includes(role),
  );
}

export function canAccessConsole(role: DemoRole): boolean {
  return BACKOFFICE.includes(role);
}

/** 销售教练：AE/售前及以上可用（SDR 档聚焦提单与提交） */
export function canUseQuoteAssistant(role: DemoRole): boolean {
  return role !== "SDR";
}

/** 销售经理 + VP 可读客户主数据；批量导入仅 VP */
export function canViewConsoleCustomers(role: DemoRole): boolean {
  return role === "SALES_MANAGER" || role === "VP";
}

export function canEditConsoleCustomers(role: DemoRole): boolean {
  return role === "VP";
}

/** CSV 导入等项目/客户批量写库操作 */
export function canImportConsoleCsv(role: DemoRole): boolean {
  return role === "VP";
}

export function canAccessConsoleRules(role: DemoRole): boolean {
  return role === "VP";
}

export function canAccessConsoleAgentAudit(role: DemoRole): boolean {
  return role === "VP";
}
