import type { DemoRole } from "./approval";

const ALL: DemoRole[] = [
  "SALES_MANAGER",
  "SALES_DIRECTOR",
  "SALES_VP",
  "GM",
  "ADMIN",
];
/** 销售经理以外：可看战略与路线 */
const NO_JUNIOR_SALES: DemoRole[] = [
  "SALES_DIRECTOR",
  "SALES_VP",
  "GM",
  "ADMIN",
];
/** 管控台：总经理 + 管理员 */
const BACKOFFICE: DemoRole[] = ["GM", "ADMIN"];

export const DEMO_NAV_LINKS = [
  { href: "/", label: "门户", roles: ALL },
  { href: "/about", label: "价值主张", roles: ALL },
  { href: "/dashboard", label: "工作台", roles: ALL },
  { href: "/projects", label: "项目", roles: ALL },
  { href: "/projects/new", label: "新建报价", roles: ALL },
  { href: "/compass", label: "盈利罗盘", roles: ALL },
  { href: "/roadmap", label: "AI交付与价值服务", roles: NO_JUNIOR_SALES },
  { href: "/data-screen", label: "数据大屏", roles: ALL },
  { href: "/console", label: "管理后台", roles: BACKOFFICE },
] as const;

export const DEMO_CONSOLE_SIDEBAR_LINKS = [
  { href: "/console", label: "控制台", roles: BACKOFFICE },
  { href: "/console/pipeline", label: "项目与审批", roles: BACKOFFICE },
  { href: "/console/customers", label: "主数据 · 客户", roles: BACKOFFICE },
  { href: "/console/readiness", label: "落地准备", roles: BACKOFFICE },
  {
    href: "/console/rules",
    label: "系数与规则",
    roles: ["ADMIN"] as DemoRole[],
  },
  {
    href: "/console/agent-audit",
    label: "智能体审计",
    roles: ["ADMIN"] as DemoRole[],
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

/** 报价智能助手：所有角色均可使用（qwen3.5 本地大模型为全角色实时赋能） */
export function canUseQuoteAssistant(_role: DemoRole): boolean {
  return true;
}

/** 总经理 + 管理员可读客户主数据；批量导入仅管理员 */
export function canViewConsoleCustomers(role: DemoRole): boolean {
  return role === "GM" || role === "ADMIN";
}

export function canEditConsoleCustomers(role: DemoRole): boolean {
  return role === "ADMIN";
}

/** CSV 导入等项目/客户批量写库操作 */
export function canImportConsoleCsv(role: DemoRole): boolean {
  return role === "ADMIN";
}

export function canAccessConsoleRules(role: DemoRole): boolean {
  return role === "ADMIN";
}

export function canAccessConsoleAgentAudit(role: DemoRole): boolean {
  return role === "ADMIN";
}
