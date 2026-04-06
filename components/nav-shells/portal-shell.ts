import type { NavLink } from "./profit-shell";

export const PORTAL_NAV_SHELL = {
  title: "AI价值服务作战平台 · 公共门户",
  subtitle: "多系统统一入口 · 公共导航",
  links: [
    { href: "/", label: "门户" },
    { href: "/health-check", label: "健康检查" },
    { href: "/profit/dashboard", label: "盈利系统模块" },
    { href: "/profit/zt007", label: "智探007模块" },
  ],
} as const;

export const PORTAL_SHELL_LINKS: ReadonlyArray<NavLink> = PORTAL_NAV_SHELL.links;
